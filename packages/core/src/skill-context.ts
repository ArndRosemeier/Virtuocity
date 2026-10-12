import type { Actor } from './actor';
import type { AssetStore } from './assets';
import type { AssembledContext } from './context-assembly';
import type { ActionInput, ActionOutput, Contract } from './contract';
import type { EventBus } from './events';
import type { JobControl } from './jobs';
import type { Content } from './output';
import type { Complete } from './provider';
import type { Message } from './transcript';
import type { CallStats } from './stats';
import type { Tool } from './tools';
import type { StateView } from './workspace';

/** Asks an actor to perform one action of a contract, typed by the contract. */
export type InvokeAction = <A, K extends keyof A & string>(
  actorId: string,
  contract: Contract<A>,
  action: K,
  input: ActionInput<A[K]>,
) => Promise<ActionOutput<A[K]>>;

/** What a skill is allowed to touch while it runs. */
export interface SkillContext {
  readonly actor: Actor;
  /** This skill's stored settings for this actor; read them with `readSettings(schema, ctx.settings)`. */
  readonly settings: unknown;
  readonly bus: EventBus;
  /** The main transcript as this actor may see it. */
  readonly transcript: readonly Message[];
  /** Shared documents from this actor's perspective; changes are made as this actor. */
  readonly state: StateView;
  /** Everyone currently in the session, support actors included. */
  readonly actors: readonly Actor[];
  /** The cast: people and the actors who take turns talking. Support actors are left out. */
  readonly cast: readonly Actor[];
  /** Adds a message from this actor to the story: any content, with its text form. */
  post(content: Content, stats?: readonly CallStats[]): Promise<Message>;
  /** Runs a model call. The model is already resolved for this skill and actor. */
  readonly complete: Complete;
  /**
   * The actor's other abilities as tools for model calls: every action of every
   * contract its other skills implement. Calling one runs that skill.
   */
  readonly tools: readonly Tool[];
  /**
   * What this actor knows beyond the transcript (who is here, the outline, a
   * summary...), contributed by modules and fitted into `budget` tokens.
   */
  context(budget: number): AssembledContext;
  /** Where pictures, sound and other binary content are kept; messages hold asset ids. */
  readonly assets: AssetStore;
  /**
   * Starts work that runs beside the story (e.g. generating a picture) and
   * returns at once. People see it and can cancel it; pass `control.signal`
   * to model calls. Errors end the job and are shown, never thrown.
   */
  startJob(label: string, run: (control: JobControl) => Promise<void>): void;
  /** Asks another actor to perform a contract action, e.g. an editor asking a reviewer for notes. */
  readonly invoke: InvokeAction;
}
