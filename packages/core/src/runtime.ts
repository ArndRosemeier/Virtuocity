import type { Actor } from './actor';
import { EventBus, defineEvent } from './events';
import type { VEvent } from './events';
import type { ModelOverrides } from './models';
import { resolveModel } from './models';
import type { ModuleHost } from './module';
import type { OutputPart } from './output';
import { MessageTree } from './session';
import type { Message } from './session';
import type { Skill, SkillContext } from './skill';
import type { CallStats } from './stats';

export const actorJoined = defineEvent<{ readonly actorId: string }>('actor.joined');
export const actorLeft = defineEvent<{ readonly actorId: string }>('actor.left');
export const messagePosted = defineEvent<{ readonly messageId: string }>('message.posted');

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
  readonly #actors = new Map<string, Actor>();

  constructor(private readonly config: SessionConfig) {
    this.bus.on('*', (event) => this.#dispatch(event));
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
    await skill.takeTurn(this.#context(actor, skill));
  }

  /** The human passes: the director picks one AI actor to take a turn. */
  async pass(): Promise<Actor | undefined> {
    const director = this.config.host.directors.get(this.config.directorId);
    const next = await director.pickNext({ candidates: this.speakers(), messages: this.messages });
    if (next) await this.runTurn(next.id);
    return next;
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
