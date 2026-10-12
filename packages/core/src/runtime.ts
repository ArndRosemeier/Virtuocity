import type { Actor } from './actor';
import { resolveImplementation } from './adapter';
import type { Contract } from './contract';
import { EventBus, defineEvent } from './events';
import type { VEvent } from './events';
import { HumanTaskQueue } from './human-tasks';
import type { Implementation } from './implementation';
import { ContractError, invokeAction } from './implementation';
import type { ModelOverrides } from './models';
import { resolveModel } from './models';
import type { ModuleHost } from './module';
import type { OutputPart } from './output';
import { MessageTree } from './session';
import type { Message } from './session';
import type { Skill, SkillContext } from './skill';
import type { InvokeAction } from './skill-context';
import type { CallStats } from './stats';

export const actorJoined = defineEvent<{ readonly actorId: string }>('actor.joined');
export const actorLeft = defineEvent<{ readonly actorId: string }>('actor.left');
export const messagePosted = defineEvent<{ readonly messageId: string }>('message.posted');
export const turnStarted = defineEvent<{ readonly actorId: string }>('turn.started');
export const turnEnded = defineEvent<{ readonly actorId: string }>('turn.ended');

export interface SessionConfig {
  readonly host: ModuleHost<unknown, unknown>;
  readonly providerId: string;
  readonly directorId: string;
  /** Read on every call so settings changes apply immediately. */
  readonly modelDefaults: () => ModelOverrides;
}

/**
 * A running session: who is in it, the story so far, and the turn mechanics.
 * Turns never chain on their own: each call runs at most one AI turn and then
 * the session pauses, so the human can always act, pass or pick a speaker.
 */
export class SessionRuntime {
  readonly bus = new EventBus();
  readonly messages = new MessageTree();
  /** Contract actions waiting for a human to answer. */
  readonly tasks = new HumanTaskQueue({ bus: this.bus });
  readonly #actors = new Map<string, Actor>();
  #speaking: string | undefined;

  constructor(private readonly config: SessionConfig) {
    this.bus.on('*', (event) => this.#dispatch(event));
  }

  /** Id of the actor whose turn is running, if any. */
  get speaking(): string | undefined {
    return this.#speaking;
  }

  get actors(): Actor[] {
    return [...this.#actors.values()];
  }

  /** Actors can join (or be updated) at any time. */
  async join(actor: Actor): Promise<void> {
    this.#actors.set(actor.id, actor);
    await this.bus.emit(actorJoined.create({ actorId: actor.id }));
  }

  async leave(actorId: string): Promise<void> {
    if (this.#actors.delete(actorId)) await this.bus.emit(actorLeft.create({ actorId }));
  }

  async post(
    actorId: string,
    parts: readonly OutputPart[],
    stats?: readonly CallStats[],
  ): Promise<Message> {
    const message = this.messages.append({ actorId, parts, ...(stats ? { stats } : {}) });
    await this.bus.emit(messagePosted.create({ messageId: message.id }, actorId));
    return message;
  }

  /** AI actors that hold a turn-taking skill. */
  speakers(): Actor[] {
    return this.actors.filter((a) => a.controller === 'ai' && this.#turnSkill(a) !== undefined);
  }

  /** Lets one specific actor take a turn. */
  async runTurn(actorId: string): Promise<void> {
    const actor = this.#actors.get(actorId);
    const skill = actor && this.#turnSkill(actor);
    if (!actor || !skill?.takeTurn) throw new Error(`"${actorId}" cannot take a turn`);
    this.#speaking = actorId;
    await this.bus.emit(turnStarted.create({ actorId }));
    try {
      await skill.takeTurn(this.#context(actor, skill));
    } finally {
      this.#speaking = undefined;
      await this.bus.emit(turnEnded.create({ actorId }));
    }
  }

  /** The human passes: the director picks one AI actor to take a turn. */
  async pass(): Promise<Actor | undefined> {
    const director = this.config.host.directors.get(this.config.directorId);
    const next = await director.pickNext({ candidates: this.speakers(), messages: this.messages });
    if (next) await this.runTurn(next.id);
    return next;
  }

  /**
   * Asks an actor to perform a contract action. AI actors answer through the
   * skill implementing the contract (or a descendant, or via an adapter);
   * human actors get a task to fill in.
   */
  readonly invoke: InvokeAction = async (actorId, contract, action, input) => {
    // Results are validated against the contract's schemas; the casts only restore generics.
    const actor = this.#actor(actorId);
    const erased = contract as Contract;
    if (actor.controller === 'human') {
      return (await this.tasks.request(actorId, erased, action, input)) as never;
    }
    const found = this.#implementation(actor, erased);
    if (!found) {
      throw new ContractError('no-implementation', `"${actorId}" cannot serve "${contract.id}"`);
    }
    const ctx = this.#context(actor, found.candidate);
    return (await invokeAction(found.implementation, action, input, ctx)) as never;
  };

  /** How an AI actor would serve `contract`, if it can. */
  implementationFor(actorId: string, contract: Contract): Implementation | undefined {
    return this.#implementation(this.#actor(actorId), contract)?.implementation;
  }

  #implementation(actor: Actor, contract: Contract) {
    const skills = actor.skillIds
      .map((id) => this.config.host.skills.find(id))
      .filter((s): s is Skill => s !== undefined);
    const adapters = this.config.host.adapters.list();
    return resolveImplementation(skills, (s) => s.implements ?? [], contract, adapters);
  }

  #actor(actorId: string): Actor {
    const actor = this.#actors.get(actorId);
    if (!actor) throw new ContractError('no-implementation', `"${actorId}" is not in the session`);
    return actor;
  }

  #turnSkill(actor: Actor): Skill | undefined {
    return actor.skillIds.map((id) => this.config.host.skills.find(id)).find((s) => s?.takeTurn);
  }

  #context(actor: Actor, skill: Skill): SkillContext {
    return {
      actor,
      bus: this.bus,
      messages: this.messages,
      actors: this.actors,
      post: (parts, stats) => this.post(actor.id, parts, stats),
      invoke: this.invoke,
      complete: (request) => {
        const model = resolveModel(request.modality, {
          defaults: this.config.modelDefaults(),
          actor: actor.models,
          skill: skill.models,
        });
        return this.config.host.providers
          .get(this.config.providerId)
          .complete({ ...request, model });
      },
    };
  }

  /** Delivers events to every skill of every actor that listens for them. */
  async #dispatch(event: VEvent): Promise<void> {
    const deliveries = this.actors.flatMap((actor) =>
      actor.skillIds
        .map((id) => this.config.host.skills.find(id))
        .filter((s): s is Skill => !!s?.onEvent && !!s.listensTo?.includes(event.type))
        .map((skill) => skill.onEvent?.(event, this.#context(actor, skill))),
    );
    await Promise.all(deliveries);
  }
}
