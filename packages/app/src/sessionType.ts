import type {
  Actor,
  Identified,
  SessionRole,
  SessionTypeDescription,
  Skill,
} from '@virtuocity/core';
import { arrangeSlot, castCapable, implementersOf, tryParseRef } from '@virtuocity/core';

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

/** The installed skills that can do each thing the role needs; a need nobody can do has none. */
function needOptions(
  role: SessionRole,
  castContracts: readonly string[],
  skills: readonly Skill[],
): Skill[][] {
  const contracts = role.needs.map((need) => {
    const ref = tryParseRef(need);
    return ref ? implementersOf(skills, ref) : [];
  });
  return role.cast ? [castCapable(skills, castContracts), ...contracts] : contracts;
}

/** Whether an actor can fill a role: one of its skills does each thing the role needs. */
export function roleFit(
  role: SessionRole,
  castContracts: readonly string[],
  skills: readonly Skill[],
): {
  readonly fits: (actor: Actor) => boolean;
  readonly available: boolean;
  readonly skills: string[];
} {
  const options = needOptions(role, castContracts, skills);
  return {
    fits: (a) => options.every((o) => o.some((s) => a.skillIds.includes(s.id))),
    available: options.every((o) => o.length > 0),
    // A new actor for the role starts with the first skill able to do each thing it needs.
    skills: [...new Set(options.flatMap((o) => (o[0] ? [o[0].id] : [])))],
  };
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
  { roles, castContracts }: Pick<SessionTypeDescription, 'roles' | 'castContracts'>,
  skills: readonly Skill[],
  actors: readonly Actor[],
): GuideLine[] {
  const used = new Set<string>();
  return roles.map((role) => {
    const { fits, available } = roleFit(role, castContracts, skills);
    const actor = actors.find((a) => !used.has(a.id) && fits(a));
    if (actor) used.add(actor.id);
    return actor ? { role, available, actor } : { role, available };
  });
}
