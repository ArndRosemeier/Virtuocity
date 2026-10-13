import type {
  Actor,
  ContractRef,
  Identified,
  SessionRole,
  SessionTypeDescription,
  Skill,
} from '@virtuocity/core';
import { arrangeSlot, implementersOf, parseRef } from '@virtuocity/core';

/**
 * What a session shows of its type: `asking` until the type first answers
 * (nothing yet, so the screen does not flash every panel), then its
 * description. `none` (every panel) is only seen while a session is being
 * swapped in, since every session the app keeps has a type.
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
function needOptions(
  role: SessionRole,
  castSkills: readonly string[],
  skills: readonly Skill[],
): Skill[][] {
  const contracts = role.needs.map((need) => {
    const ref = refOf(need);
    return ref ? implementersOf(skills, ref) : [];
  });
  return role.cast ? [skills.filter((s) => castSkills.includes(s.id)), ...contracts] : contracts;
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
  { roles, castSkills }: Pick<SessionTypeDescription, 'roles' | 'castSkills'>,
  skills: readonly Skill[],
  actors: readonly Actor[],
): GuideLine[] {
  const used = new Set<string>();
  return roles.map((role) => {
    const options = needOptions(role, castSkills, skills);
    const fits = (a: Actor) => options.every((o) => o.some((s) => a.skillIds.includes(s.id)));
    const actor = actors.find((a) => !used.has(a.id) && fits(a));
    if (actor) used.add(actor.id);
    const available = options.every((o) => o.length > 0);
    return actor ? { role, available, actor } : { role, available };
  });
}
