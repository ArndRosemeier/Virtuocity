import type { SessionRole, SessionTypeDescription } from '@virtuocity/contract-session-type';
import { sessionTypeContract } from '@virtuocity/contract-session-type';
import type { Actor, ContractRef, Identified, Skill } from '@virtuocity/core';
import { arrangeSlot, implementersOf, parseRef, serves } from '@virtuocity/core';

/** Whether the actor is a session type (Roleplay, Book room...). */
export function isSessionType(actor: Actor, skills: readonly Skill[]): boolean {
  return serves(actor, skills, sessionTypeContract);
}

/** The session's type: the one actor in its cast serving `session-type@1`, if any. */
export function sessionTypeOf(
  actors: readonly Actor[],
  skills: readonly Skill[],
): Actor | undefined {
  return actors.find((a) => isSessionType(a, skills));
}

/**
 * What a session shows of its type while it is being asked: `none` without a
 * type (every panel), `asking` until the first answer (nothing yet, so the
 * screen does not flash every panel), then its description, or every panel
 * again when it failed.
 */
export type TypeState =
  | { readonly kind: 'none' }
  | { readonly kind: 'asking' }
  | {
      readonly kind: 'described';
      readonly actor: Actor;
      readonly description: SessionTypeDescription;
    };

/** What a slot shows under the session's type, in the type's order. */
export function slotItems<T extends Identified & { readonly slot: string }>(
  items: readonly T[],
  slot: string,
  state: TypeState,
): T[] {
  if (state.kind === 'asking') return [];
  return arrangeSlot(items, slot, state.kind === 'described' ? state.description.panels : []);
}

const refOf = (text: string): ContractRef | undefined => {
  try {
    return parseRef(text);
  } catch {
    return undefined;
  }
};

/** The installed skills that can do each thing the role needs; a need nobody can do has none. */
function needOptions(role: SessionRole, skills: readonly Skill[]): Skill[][] {
  const contracts = role.needs.map((need) => {
    const ref = refOf(need);
    return ref ? implementersOf(skills, ref) : [];
  });
  return role.speaks ? [skills.filter((s) => s.takeTurn), ...contracts] : contracts;
}

function fits(role: SessionRole, actor: Actor, skills: readonly Skill[]): boolean {
  return needOptions(role, skills).every((options) =>
    options.some((skill) => actor.skillIds.includes(skill.id)),
  );
}

/** A line of the setup guide: the role, whether it can be filled, and the actor filling it. */
export interface GuideLine {
  readonly role: SessionRole;
  /** An installed skill can do everything the role needs. */
  readonly available: boolean;
  readonly actor?: Actor;
}

/** Matches the cast to the roles: each actor fills the first open role it fits, in order. */
export function guideLines(
  roles: readonly SessionRole[],
  skills: readonly Skill[],
  actors: readonly Actor[],
): GuideLine[] {
  const used = new Set<string>();
  return roles.map((role) => {
    const actor = actors.find((a) => !used.has(a.id) && fits(role, a, skills));
    if (actor) used.add(actor.id);
    const available = needOptions(role, skills).every((options) => options.length > 0);
    return actor ? { role, available, actor } : { role, available };
  });
}
