import type { Actor, Personality } from './actor';
import type { Contract } from './contract';
import type { ModelOverrides } from './models';
import type { Identified } from './registry';
import type { Skill } from './skill';
import { implementersOf } from './skill';
import { uniqueNames } from './library-migrate';

/**
 * A part a blueprint casts. It says who the actor is and what it must be able
 * to do, never which skill does it: the user picks a skill for every need.
 */
export interface BlueprintRole extends Identified {
  /** What the setup guide calls the role, e.g. "A narrator"; defaults to the personality's name. */
  readonly label?: string;
  /** One line in the setup guide on what the role adds. */
  readonly hint?: string;
  /** The default actor for the role, offered in the library on a fresh start. */
  readonly personality: Personality;
  /** The actor takes turns in the conversation. */
  readonly speaks?: boolean;
  /** Contracts the actor must serve. */
  readonly needs?: readonly Contract[];
  /** The user may leave this role out; it is left out when no skill can fill it. */
  readonly optional?: boolean;
  readonly settings?: Readonly<Record<string, unknown>>;
  readonly profile?: Readonly<Record<string, unknown>>;
  readonly models?: ModelOverrides;
}

/**
 * How the app arranges a session of this blueprint: for each slot (`main`,
 * `input`, `side`...), the contributions to show by id, in this order. A slot
 * the layout does not name shows everything contributed to it.
 */
export type BlueprintLayout = Readonly<Partial<Record<string, readonly string[]>>>;

/** The contributions a slot shows under a layout, in the layout's order. */
export function arrangeSlot<T extends Identified & { readonly slot: string }>(
  items: readonly T[],
  slot: string,
  layout?: BlueprintLayout,
): T[] {
  const inSlot = items.filter((i) => i.slot === slot);
  const wanted = layout?.[slot];
  if (!wanted) return inSlot;
  return wanted.flatMap((id) => inSlot.filter((i) => i.id === id));
}

/**
 * A ready-made setup ("Roleplay", "Book room"): how it looks, and the roles the
 * setup guide suggests. Starting one adds nobody; you add actors yourself.
 */
export interface Blueprint extends Identified {
  readonly name: string;
  readonly description: string;
  readonly roles: readonly BlueprintRole[];
  readonly layout?: BlueprintLayout;
}

export function defineBlueprint(blueprint: Blueprint): Blueprint {
  const ids = blueprint.roles.map((r) => r.id);
  const twice = ids.find((id, i) => ids.indexOf(id) !== i);
  if (twice) throw new Error(`Blueprint "${blueprint.id}" has two roles called "${twice}"`);
  return blueprint;
}

/** Something a role must be able to do, and the installed skills that can do it. */
export interface RoleNeed {
  /** `speaks`, or the id of the contract needed. */
  readonly id: string;
  readonly options: readonly Skill[];
}

export function roleNeeds(role: BlueprintRole, skills: readonly Skill[]): RoleNeed[] {
  const needs = (role.needs ?? []).map((c) => ({ id: c.id, options: implementersOf(skills, c) }));
  if (!role.speaks) return needs;
  return [{ id: 'speaks', options: skills.filter((s) => s.takeTurn) }, ...needs];
}

/** Whether a role is cast, and the skill picked for each of its needs, in order. */
export interface RoleChoice {
  readonly included: boolean;
  readonly skillIds: readonly string[];
}

export type CastChoices = Readonly<Record<string, RoleChoice>>;

const fillable = (needs: readonly RoleNeed[]) => needs.every((n) => n.options.length > 0);

/** The first skill for every need; optional roles that cannot be filled are left out. */
export function defaultChoices(blueprint: Blueprint, skills: readonly Skill[]): CastChoices {
  return Object.fromEntries(
    blueprint.roles.map((role) => {
      const needs = roleNeeds(role, skills);
      const skillIds = needs.map((n) => n.options[0]?.id ?? '');
      return [role.id, { included: fillable(needs), skillIds }];
    }),
  );
}

/** Why the blueprint cannot start with the installed skills; empty when it can. */
export function blueprintProblems(blueprint: Blueprint, skills: readonly Skill[]): string[] {
  return blueprint.roles
    .filter((role) => !role.optional)
    .flatMap((role) =>
      roleNeeds(role, skills)
        .filter((n) => n.options.length === 0)
        .map((n) => `No installed skill can fill "${n.id}" for ${role.personality.name}.`),
    );
}

/** The AI actors the blueprint starts with, given the user's choices. */
export function castBlueprint(blueprint: Blueprint, choices: CastChoices): Actor[] {
  return blueprint.roles.flatMap((role) => {
    const choice = choices[role.id];
    if (!choice?.included) return [];
    const { id, personality, settings, profile, models } = role;
    const skillIds = [...new Set(choice.skillIds.filter(Boolean))];
    return [
      {
        id,
        controller: 'ai' as const,
        personality,
        skillIds,
        ...(settings ? { settings } : {}),
        ...(profile ? { profile } : {}),
        ...(models ? { models } : {}),
      },
    ];
  });
}

/**
 * The default actors of every installed blueprint, cast with the first skill for
 * each need and given fresh ids and unique names. Roles no skill can fill are left out.
 */
export function defaultActors(
  blueprints: readonly Blueprint[],
  skills: readonly Skill[],
  newId: () => string,
): Actor[] {
  const actors = blueprints.flatMap((b) => castBlueprint(b, defaultChoices(b, skills)));
  return uniqueNames(actors.map((actor) => ({ ...actor, id: newId() })));
}

/** Whether the actor's skills can do everything the role needs. */
export function fitsRole(role: BlueprintRole, actor: Actor, skills: readonly Skill[]): boolean {
  return roleNeeds(role, skills).every((need) =>
    need.options.some((skill) => actor.skillIds.includes(skill.id)),
  );
}

/** A line of the setup guide: the role, whether it can be filled, and the actor filling it. */
export interface GuideLine {
  readonly role: BlueprintRole;
  readonly label: string;
  /** An installed skill can do everything the role needs. */
  readonly available: boolean;
  readonly actor?: Actor;
}

/** Matches the session's actors to the blueprint's roles, each actor to one role, in order. */
export function setupGuide(
  blueprint: Blueprint,
  skills: readonly Skill[],
  actors: readonly Actor[],
): GuideLine[] {
  const used = new Set<string>();
  return blueprint.roles.map((role) => {
    const actor = actors.find((a) => !used.has(a.id) && fitsRole(role, a, skills));
    if (actor) used.add(actor.id);
    const label = role.label ?? role.personality.name;
    const available = fillable(roleNeeds(role, skills));
    return actor ? { role, label, available, actor } : { role, label, available };
  });
}
