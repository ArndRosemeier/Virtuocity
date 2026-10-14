import type { Actor, SessionRole, SessionTypeDescription, Skill } from '@virtuocity/core';
import { SessionRuntime, hideGuide, sessionTypeContract, startSession } from '@virtuocity/core';
import { roleFit } from './sessionType';
import type { SessionSwitcher } from './switcher';
import type { AppHost } from './types';

/** One question of the setup wizard: a role of the session type and who could fill it. */
export interface RoleStep {
  readonly role: SessionRole;
  /** Library actors able to fill the role. */
  readonly candidates: readonly Actor[];
  /** The skills a new actor for the role starts with. */
  readonly skills: readonly string[];
  /** An installed skill can do everything the role needs. */
  readonly available: boolean;
}

/** The wizard's questions: one per role of the type, in the type's order. */
export function roleSteps(
  { roles, castContracts }: Pick<SessionTypeDescription, 'roles' | 'castContracts'>,
  skills: readonly Skill[],
  library: readonly Actor[],
): RoleStep[] {
  return roles.map((role) => {
    const fit = roleFit(role, castContracts, skills);
    return {
      role,
      candidates: library.filter(fit.fits),
      skills: fit.skills,
      available: fit.available,
    };
  });
}

/**
 * Who a step starts with: nobody for an optional role; for a needed or
 * recommended one, the only candidate no earlier step has, if there is just
 * one. Otherwise it waits for the person (`undefined`).
 */
export function firstPick(step: RoleStep, taken: readonly string[]): StepPick {
  if (step.role.importance === 'optional') return null;
  const free = step.candidates.filter((a) => !taken.includes(a.id));
  return free.length === 1 ? free[0]?.id : undefined;
}

/** The actor picked for a step: an id, `null` for nobody, `undefined` while undecided. */
export type StepPick = string | null | undefined;

/** Who fills each step: what the person picked, else what the step starts with. */
export function resolvePicks(steps: readonly RoleStep[], picks: readonly StepPick[]): StepPick[] {
  const chosen: StepPick[] = [];
  steps.forEach((step, i) => {
    const taken = chosen.filter((id): id is string => typeof id === 'string');
    const pick = picks[i];
    chosen.push(pick !== undefined ? pick : firstPick(step, taken));
  });
  return chosen;
}

/** What a library session type says about itself, asked in a session of its own. */
export async function describeType(host: AppHost, type: Actor): Promise<SessionTypeDescription> {
  const scratch = new SessionRuntime({ host, modelDefaults: () => ({}) });
  await scratch.join(type);
  return scratch.invoke(type.id, sessionTypeContract, 'describe', {});
}

/**
 * Starts a named session of `type` with the actors the wizard picked, in the
 * type's order; with `guide` off, the type's checklist stays hidden in it.
 */
export function startPicked(
  switcher: SessionSwitcher,
  name: string,
  type: Actor,
  { picked, guide = true }: { readonly picked: readonly Actor[]; readonly guide?: boolean },
): Promise<void> {
  return switcher.startNew(name, async (session) => {
    await startSession(session, [type, ...picked]);
    if (!guide) await hideGuide(session);
  });
}
