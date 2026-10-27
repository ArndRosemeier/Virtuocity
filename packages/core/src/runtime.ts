import type { Actor } from './actor';
import { resolveImplementation } from './adapter';
import type { AssetStore, StoredAsset } from './assets';
import { createAssetStore } from './assets';
import type { CallMeta } from './calls';
import { CallLog } from './calls';
import { CAST, castActors, castDoc, joinOp } from './cast';
import type { Contract } from './contract';
import { createSkillContext } from './contexts';
import type { DecisionRequest, DecisionResult } from './decisions';
import { DECISIONS_MODALITY } from './decisions';
import { decisionCall } from './decision-call';
import { EventBus } from './events';
import { FlowRunner } from './flow-runner';
import type { VEvent } from './events';
import { HumanTaskQueue } from './human-tasks';
import { instructionsContract, standingInstructions, withInstructions } from './instructions';
import { JobQueue } from './jobs';
import { withPictureUrls } from './pictures';
import type { Implementation } from './implementation';
import { ContractError, invokeAction } from './implementation';
import type { DescribedType } from './session-type';
import { sessionTypeContract, sessionTypeDescribed } from './session-type';
import { SessionCast } from './session-cast';
import { actorJoined, actorLeft, messagePosted, turnEnded, turnStarted } from './session-events';
import { beginIfEmpty } from './session-events';
import type { ModelOverrides } from './models';
import { parseModelRef, resolveModel, resolveModelSelection } from './models';
import type { ModuleHost } from './module';
import type { Content } from './output';
import type { CompletionRequest, CompletionResult, ModelRequest } from './provider';
import type { Skill, SkillContext } from './skill';
import { implementersOf } from './skill';
import type { InvokeAction } from './skill-context';
import { memoryStore } from './storage';
import type { RewindOptions } from './oplog';
import type { SavedSession } from './persistence';
import { migrateOperations, parseSavedSession, savedSession } from './persistence';
import type { CallStats } from './stats';
import type { Message } from './transcript';
import { MAIN_TRANSCRIPT, postingOperation, transcriptDoc } from './transcript';
import type { ChangeOptions } from './workspace';
import { Workspace } from './workspace';

const TRANSCRIPT = { docId: MAIN_TRANSCRIPT, docType: transcriptDoc } as const;

export interface SessionConfig {
  readonly host: ModuleHost<unknown, unknown>;
  /** Read on every call so settings changes apply immediately. */
  readonly modelDefaults: () => ModelOverrides;
  /** Where generated media is kept. Defaults to memory. */
  readonly assets?: AssetStore;
  readonly newId?: () => string;
  readonly now?: () => number;
  /** Finds library actors; the session includes them by id, never as a copy (see `castDoc`). */
  readonly actors?: (id: string) => Actor | undefined;
}

/**
 * A running session: who is in it, the story so far, and the turn mechanics.
 * Turns never chain on their own: each call runs at most one AI turn and then
 * the session pauses, so the human can always act, pass or pick a speaker.
 */
export class SessionRuntime {
  readonly bus = new EventBus();
  /** All shared state: every document, folded from one operation log. */
  readonly workspace: Workspace;
  /** Contract actions waiting for a human to answer. */
  readonly tasks: HumanTaskQueue;
  /** Runs flows (turn-taking, pipelines, game loops) one at a time. */
  readonly flows: FlowRunner;
  /** Traces of recent model calls, including text still streaming in. */
  readonly calls: CallLog;
  /** Work running beside the story, e.g. pictures being generated. */
  readonly jobs: JobQueue;
  readonly assets: AssetStore;
  readonly #newId: () => string;
  readonly #now: () => number;
  readonly #spent: CallStats[] = [];
  #speaking: string | undefined;
  readonly #cast = new SessionCast({
    actors: () => this.actors,
    skills: () => this.config.host.skills.list(),
    skillsOf: (actor) => this.#skills(actor),
    ask: (type) => this.invoke(type.id, sessionTypeContract, 'describe', {}),
    announce: (type) => this.bus.emit(sessionTypeDescribed.create({ actorId: type.id })),
  });
  /** Aborts the model calls of the turn being taken. */
  #turn: AbortController | undefined;

  constructor(private readonly config: SessionConfig) {
    this.#newId = config.newId ?? (() => crypto.randomUUID());
    this.#now = config.now ?? Date.now;
    const { bus } = this;
    const ids = { newId: this.#newId, now: this.#now };
    this.workspace = new Workspace({ bus, policies: () => config.host.policies.list(), ...ids });
    this.tasks = new HumanTaskQueue({ bus, ...ids });
    this.calls = new CallLog({ bus, ...ids });
    this.jobs = new JobQueue({ bus, ...ids });
    this.assets = config.assets ?? createAssetStore(memoryStore<StoredAsset>());
    this.flows = new FlowRunner(this, (id) => config.host.flows.get(id));
    this.bus.on('*', (event) => this.#dispatch(event));
  }

  /** Id of the actor whose turn is running, if any. */
  get speaking(): string | undefined {
    return this.#speaking;
  }

  /** Everyone in the session at the head; included actors as the lookup has them now. */
  get actors(): readonly Actor[] {
    return castActors(this.workspace.read(CAST, castDoc), this.lookup);
  }

  /** Finds actors kept outside the session (library actors); finds none without a lookup. */
  readonly lookup = (id: string): Actor | undefined => this.config.actors?.(id);

  /** Actors join (or are updated) at any time; one the lookup knows is included by id. */
  async join(actor: Actor): Promise<void> {
    const payload = joinOp(actor, this.lookup);
    await this.workspace.change({ actorId: actor.id, docId: CAST, docType: castDoc, payload });
    await this.#cast.settle();
    await this.bus.emit(actorJoined.create({ actorId: actor.id }));
  }

  /** An actor leaves from here on: what it did stays, its running jobs stop. */
  async leave(actorId: string): Promise<void> {
    if (!this.actors.some((a) => a.id === actorId)) return;
    this.jobs.cancelOf(actorId);
    const payload = { type: 'leave', actorId } as const;
    await this.workspace.change({ actorId, docId: CAST, docType: castDoc, payload });
    await this.#cast.settle();
    await this.bus.emit(actorLeft.create({ actorId }));
  }

  /** The main transcript at the head, from an actor's perspective or omnisciently. */
  transcript(perspective?: string): readonly Message[] {
    return this.workspace.read(MAIN_TRANSCRIPT, transcriptDoc, perspective).messages;
  }

  async post(
    actorId: string,
    content: Content,
    stats?: readonly CallStats[],
    options: ChangeOptions = {},
  ): Promise<Message> {
    await beginIfEmpty(this);
    const message: Message = {
      id: this.#newId(),
      actorId,
      kind: content.kind,
      data: content.data,
      text: content.text,
      ...(stats ? { stats } : {}),
      createdAt: this.#now(),
    };
    const payload = { type: 'append', message } as const;
    await this.workspace.change({ ...options, actorId, ...TRANSCRIPT, payload });
    await this.bus.emit(messagePosted.create({ messageId: message.id }, actorId));
    return message;
  }

  async editMessage(actorId: string, messageId: string, content: Content): Promise<void> {
    const payload = { type: 'edit', messageId, content } as const;
    await this.workspace.change({ actorId, ...TRANSCRIPT, payload });
  }

  /** Takes one message out of the story; everything after it stays. */
  async removeMessage(actorId: string, messageId: string): Promise<void> {
    const payload = { type: 'remove', messageId } as const;
    await this.workspace.change({ actorId, ...TRANSCRIPT, payload });
  }

  /**
   * Moves all state back to just after a message was posted (or just before,
   * with `before`, e.g. to regenerate it). Every document rewinds together.
   */
  async rewindToMessage(
    messageId: string,
    options: RewindOptions & { readonly before?: boolean } = {},
  ): Promise<void> {
    const op = postingOperation(this.workspace.log, messageId);
    await this.workspace.rewindTo(options.before ? op.parentId : op.id, options);
  }

  /** A snapshot of the whole session (every branch) that `load` can bring back. */
  save(): SavedSession {
    return savedSession(this.workspace.log, this.#spent, this.#now());
  }

  /** Replaces this session with saved data, upgrading old document versions. */
  async load(data: unknown): Promise<void> {
    const saved = parseSavedSession(data);
    const docTypes = (id: string) => this.config.host.docTypes.find(id);
    const operations = migrateOperations(saved.operations, docTypes);
    this.#spent.splice(0, this.#spent.length, ...saved.spent);
    await this.workspace.load(operations, saved.head);
    await this.#cast.settle();
  }

  /** Stats of every AI call in the session, including ones on discarded branches. */
  allStats(): readonly CallStats[] {
    return this.#spent;
  }

  /**
   * The session's type (see `sessionTypeContract`) as it last described
   * itself; undefined without a type, or until it first answers.
   */
  sessionType(): DescribedType | undefined {
    return this.#cast.type();
  }

  /** People, and the AI actors the session type casts (see `SessionCast`). */
  cast(): Actor[] {
    return this.#cast.cast();
  }

  /** AI actors in the cast. */
  speakers(): Actor[] {
    return this.#cast.speakers();
  }

  /** AI support actors a person can ask to act (`onRequest`); a director never picks them. */
  askable(): Actor[] {
    return this.#cast.askable();
  }

  /** Whether a cast actor's settings say it speaks only when a person picks it (see `Skill`). */
  waitsToBeAsked(actorId: string): boolean {
    return this.#cast.waitsToBeAsked(this.#actor(actorId));
  }

  /**
   * Lets one specific actor take a turn, or act on request when it is askable.
   * A turn ended with `stop` ends quietly, posting nothing more.
   */
  async runTurn(actorId: string): Promise<void> {
    const actor = this.actors.find((a) => a.id === actorId);
    const skill = actor && this.#cast.actingSkill(actor);
    const act = skill?.takeTurn ?? skill?.onRequest;
    if (!actor || !skill || !act) throw new Error(`"${actorId}" cannot take a turn`);
    await beginIfEmpty(this);
    const turn = new AbortController();
    this.#turn = turn;
    this.#speaking = actorId;
    await this.bus.emit(turnStarted.create({ actorId }));
    try {
      await act.call(skill, this.#context(actor, skill));
    } catch (error) {
      if (!turn.signal.aborted) throw error;
    } finally {
      this.#turn = undefined;
      this.#speaking = undefined;
      await this.bus.emit(turnEnded.create({ actorId }));
    }
  }

  /** Stops whatever an AI is generating: the current turn's model calls and the running flow. */
  async stop(): Promise<void> {
    this.#turn?.abort();
    await this.flows.interrupt();
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
    const adapters = this.config.host.adapters.list();
    const skills = this.#skills(actor);
    return resolveImplementation(skills, (s) => s.implements ?? [], contract, adapters);
  }

  #skills(actor: Actor): Skill[] {
    return actor.skillIds
      .map((id) => this.config.host.skills.find(id))
      .filter((s): s is Skill => s !== undefined);
  }

  #actor(actorId: string): Actor {
    const actor = this.actors.find((a) => a.id === actorId);
    if (!actor) throw new ContractError('no-implementation', `"${actorId}" is not in the session`);
    return actor;
  }

  #context(actor: Actor, skill: Skill): SkillContext {
    const complete = (request: ModelRequest) => this.#complete(actor, skill, request);
    const decide = (request: Omit<DecisionRequest, 'model'>) => this.#decide(actor, skill, request);
    const skills = this.#skills(actor);
    const contributors = this.config.host.contextContributors.list();
    return createSkillContext(this, actor, skill, { complete, decide, skills, contributors });
  }

  /** Runs one model call for a skill: picks the model, traces the call, records its cost. */
  async #complete(actor: Actor, skill: Skill, request: ModelRequest): Promise<CompletionResult> {
    const selection = resolveModelSelection(request.modality, this.#models(actor, skill));
    const messages = await this.#instructed(actor, skill, request);
    return this.#call({ actorId: actor.id, skillId: skill.id }, {
      ...request,
      messages,
      ...selection,
    });
  }

  /** The model choices that apply to a skill's calls, from the defaults to the skill's own. */
  #models(actor: Actor, skill: Skill) {
    return { defaults: this.config.modelDefaults(), actor: actor.models, skill: skill.models };
  }

  /** Runs one decision call for a skill, traced and counted like any model call. */
  async #decide(
    actor: Actor,
    skill: Skill,
    request: Omit<DecisionRequest, 'model'>,
  ): Promise<DecisionResult> {
    const model = resolveModel(DECISIONS_MODALITY.id, this.#models(actor, skill));
    const providers = (id: string) => this.config.host.providers.get(id);
    const call = decisionCall(model, request, providers);
    await this.#call({ actorId: actor.id, skillId: skill.id }, call.traced, call.run);
    return call.result();
  }

  /**
   * A model call made for the person rather than for an actor, e.g. rewriting a
   * text field. It uses the default model for the modality, with no standing
   * instructions, and is traced and counted like any other call.
   */
  assist(request: ModelRequest, purpose: string): Promise<CompletionResult> {
    const selection = resolveModelSelection(request.modality, {
      defaults: this.config.modelDefaults(),
    });
    return this.#call({ actorId: 'user', skillId: purpose }, { ...request, ...selection });
  }

  async #call(
    meta: CallMeta,
    request: CompletionRequest,
    run = (r: CompletionRequest) => this.#run(r),
  ): Promise<CompletionResult> {
    const signals = [request.signal, this.#turn?.signal, this.flows.signal].filter(
      (s): s is AbortSignal => s !== undefined,
    );
    const signal = signals.length > 0 ? AbortSignal.any(signals) : undefined;
    const full = { ...request, ...(signal ? { signal } : {}) };
    const result = await this.calls.track(meta, full, run);
    this.#spent.push(result.stats);
    return result;
  }

  /** Hands a call to the provider its model reference names, with the provider's own model id. */
  async #run(request: CompletionRequest): Promise<CompletionResult> {
    const { provider, model } = parseModelRef(request.model);
    const messages = await withPictureUrls(request.messages, this.assets);
    return this.config.host.providers.get(provider).complete({ ...request, messages, model });
  }

  /** A text call's messages with every standing instruction added; other modalities are left alone. */
  async #instructed(actor: Actor, skill: Skill, request: ModelRequest) {
    const source = implementersOf([skill], instructionsContract).length > 0;
    if (request.modality !== 'text' || source) return request.messages;
    const ask = (id: string) =>
      this.invoke(id, instructionsContract, 'instructions', { actorId: actor.id });
    const skills = this.config.host.skills.list();
    return withInstructions(request.messages, await standingInstructions(this.actors, skills, ask));
  }

  /** Delivers events to every skill of every actor that listens for them. */
  async #dispatch(event: VEvent): Promise<void> {
    const deliveries = this.actors.flatMap((actor) =>
      this.#skills(actor)
        .filter((s) => !!s.onEvent && !!s.listensTo?.includes(event.type))
        .map((skill) => skill.onEvent?.(event, this.#context(actor, skill))),
    );
    await Promise.all(deliveries);
  }
}
