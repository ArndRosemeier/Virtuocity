import type { Actor } from './actor';
import type { EventBus, VEvent } from './events';
import type { ModelOverrides } from './models';
import type { CompletionRequest, CompletionResult } from './provider';
import type { Identified } from './registry';
import type { MessageTree } from './session';

/** What a skill is allowed to touch while it runs. */
export interface SkillContext {
  readonly actor: Actor;
  readonly bus: EventBus;
  readonly messages: MessageTree;
  /** Runs a model call. The model is already resolved for this skill and actor. */
  complete(request: Omit<CompletionRequest, 'model'>): Promise<CompletionResult>;
}

/**
 * The single unit of capability. A skill may be backed by an LLM, by plain
 * code, or by both; the core treats them identically.
 */
export interface Skill extends Identified {
  readonly name: string;
  readonly backing: 'llm' | 'code' | 'hybrid';
  /** Model overrides that beat the actor's own overrides. */
  readonly models?: ModelOverrides;
  /** Event types this skill reacts to (used by silent and support actors). */
  readonly listensTo?: readonly string[];
  onEvent?(event: VEvent, ctx: SkillContext): Promise<void>;
  /** Present on skills that let an actor take a turn, e.g. conversation. */
  takeTurn?(ctx: SkillContext): Promise<void>;
}

export function canTakeTurns(actor: Actor, skills: (id: string) => Skill): boolean {
  return actor.skillIds.some((id) => skills(id).takeTurn !== undefined);
}
