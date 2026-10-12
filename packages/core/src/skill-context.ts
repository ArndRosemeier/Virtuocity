import type { Actor } from './actor';
import type { ActionInput, ActionOutput, Contract } from './contract';
import type { EventBus } from './events';
import type { OutputPart } from './output';
import type { CompletionRequest, CompletionResult } from './provider';
import type { Message, MessageTree } from './session';
import type { CallStats } from './stats';

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
  readonly bus: EventBus;
  readonly messages: MessageTree;
  /** Everyone currently in the session. */
  readonly actors: readonly Actor[];
  /** Adds a message from this actor to the story. */
  post(parts: readonly OutputPart[], stats?: readonly CallStats[]): Promise<Message>;
  /** Runs a model call. The model is already resolved for this skill and actor. */
  complete(request: Omit<CompletionRequest, 'model'>): Promise<CompletionResult>;
  /** Asks another actor to perform a contract action, e.g. an editor asking a reviewer for notes. */
  readonly invoke: InvokeAction;
}
