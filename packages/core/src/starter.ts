import type { Actor, Personality } from './actor';
import type { Contract } from './contract';
import type { ModelOverrides } from './models';
import type { Identified } from './registry';
import type { Skill } from './skill';
import { implementersOf } from './skill';

/**
 * A ready-made actor a module offers for the library on a fresh start, such as
 * the Narrator or the Roleplay session type. It says what the actor must be
 * able to do, never which skill does it: it gets the first installed skill for
 * every need. Once offered it is an ordinary actor the person edits or deletes.
 */
export interface Starter extends Identified {
  readonly personality: Personality;
  /** The actor takes turns in the conversation. */
  readonly speaks?: boolean;
  /** Contracts the actor must serve. */
  readonly needs?: readonly Contract[];
  /** Per-skill settings, by skill id. */
  readonly settings?: Readonly<Record<string, unknown>>;
  readonly profile?: Readonly<Record<string, unknown>>;
  readonly models?: ModelOverrides;
}

/** Something a starter must be able to do, and the installed skills that can do it. */
export interface StarterNeed {
  /** `speaks`, or the id of the contract needed. */
  readonly id: string;
  readonly options: readonly Skill[];
}

export function starterNeeds(starter: Starter, skills: readonly Skill[]): StarterNeed[] {
  const needs = (starter.needs ?? []).map((c) => ({
    id: c.id,
    options: implementersOf(skills, c),
  }));
  if (!starter.speaks) return needs;
  return [{ id: 'speaks', options: skills.filter((s) => s.takeTurn) }, ...needs];
}

/** The starter as an AI actor with the first skill for every need; none when a need has no skill. */
export function castStarter(starter: Starter, skills: readonly Skill[]): Actor | undefined {
  const needs = starterNeeds(starter, skills);
  const picked = needs.map((n) => n.options[0]?.id);
  if (picked.some((id) => id === undefined)) return undefined;
  const { id, personality, settings, profile, models } = starter;
  return {
    id,
    controller: 'ai',
    personality,
    skillIds: [...new Set(picked.filter((s): s is string => s !== undefined))],
    ...(settings ? { settings } : {}),
    ...(profile ? { profile } : {}),
    ...(models ? { models } : {}),
  };
}
