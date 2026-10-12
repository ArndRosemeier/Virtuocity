import type { Actor } from './actor';
import type { ContractRef } from './contract-version';
import { fulfils } from './contract';
import type { VEvent } from './events';
import type { Implementation } from './implementation';
import type { ModelOverrides } from './models';
import type { Identified } from './registry';
import type { SettingsSchema } from './settings';
import type { SkillContext } from './skill-context';

export type { SkillContext } from './skill-context';

/**
 * The single unit of capability. A skill may be backed by an LLM, by plain
 * code, or by both; the core treats them identically. What a skill promises
 * to others is expressed by the contracts it implements.
 */
export interface Skill extends Identified {
  readonly name: string;
  readonly backing: 'llm' | 'code' | 'hybrid';
  /** Model overrides that beat the actor's own overrides. */
  readonly models?: ModelOverrides;
  /** Modalities this skill calls models for, e.g. `text`; the app offers model choices for these only. */
  readonly modalities?: readonly string[];
  /** The skill voices the actor's personality, so it is asked for. */
  readonly persona?: boolean;
  /** The actor is a character in the story, so profile fields such as appearance describe it. */
  readonly character?: boolean;
  /** What can be set per actor, built with `defineSettings`; the app renders a form from it. */
  readonly settings?: SettingsSchema;
  /** Contracts this skill implements, built with `implement`. */
  readonly implements?: readonly Implementation[];
  /** Event types this skill reacts to (used by silent and support actors). */
  readonly listensTo?: readonly string[];
  onEvent?(event: VEvent, ctx: SkillContext): Promise<void>;
  /** Present on skills that let an actor take a turn, e.g. conversation. */
  takeTurn?(ctx: SkillContext): Promise<void>;
}

export function canTakeTurns(actor: Actor, skills: (id: string) => Skill): boolean {
  return actor.skillIds.some((id) => skills(id).takeTurn !== undefined);
}

/** Skills that can fill a slot requiring `wanted`, directly or through a descendant contract. */
export function implementersOf(skills: readonly Skill[], wanted: ContractRef): Skill[] {
  return skills.filter((s) => (s.implements ?? []).some((i) => fulfils(i.contract, wanted)));
}

/** What a set of skills uses of an actor, so editors ask only for that. */
export interface ActorUse {
  readonly persona: boolean;
  readonly character: boolean;
  readonly modalities: readonly string[];
}

export function actorUse(skills: readonly Skill[]): ActorUse {
  return {
    persona: skills.some((s) => s.persona || s.character),
    character: skills.some((s) => s.character),
    modalities: [...new Set(skills.flatMap((s) => s.modalities ?? []))],
  };
}
