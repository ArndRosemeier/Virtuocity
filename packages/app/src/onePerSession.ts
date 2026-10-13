import type { Actor, SessionRuntime } from '@virtuocity/core';
import { rivalFor } from '@virtuocity/core';
import { directorContract } from '@virtuocity/contract-director';
import { pictureSourceContract } from '@virtuocity/contract-visual';
import { sessionTypeContract } from '@virtuocity/core';
import type { AppHost } from './types';

/** Contracts a session has at most one of, and what the one actor serving it does there. */
const ONE_EACH = [
  { contract: directorContract, does: 'directs this session; a session has one director' },
  {
    contract: pictureSourceContract,
    does: 'decides the current picture; a session has one picture source',
  },
  { contract: sessionTypeContract, does: 'is the type of this session; a session has one type' },
];

/** Why the actor may not join (or change in) the session, if it may not. */
export function joinProblem(
  host: AppHost,
  session: SessionRuntime,
  actor: Actor,
): string | undefined {
  const skills = host.skills.list();
  for (const { contract, does } of ONE_EACH) {
    const rival = rivalFor(contract, actor, session.actors, skills);
    if (rival) return `${rival.personality.name} already ${does}.`;
  }
  return undefined;
}

/** Refuses with the reason when the actor may not be in the session as it is. */
export function assertCanJoin(host: AppHost, session: SessionRuntime, actor: Actor): void {
  const problem = joinProblem(host, session, actor);
  if (problem) throw new Error(problem);
}
