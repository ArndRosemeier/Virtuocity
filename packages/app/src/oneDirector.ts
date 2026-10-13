import type { Actor, SessionRuntime } from '@virtuocity/core';
import { rivalDirector } from '@virtuocity/turn-taking';
import type { AppHost } from './types';

/** Why the actor may not join (or change in) the session, if it may not: one director per session. */
export function joinProblem(
  host: AppHost,
  session: SessionRuntime,
  actor: Actor,
): string | undefined {
  const rival = rivalDirector(actor, session.actors, host.skills.list());
  return (
    rival && `${rival.personality.name} already directs this session; a session has one director.`
  );
}

/** Refuses with the reason when the actor may not be in the session as it is. */
export function assertCanJoin(host: AppHost, session: SessionRuntime, actor: Actor): void {
  const problem = joinProblem(host, session, actor);
  if (problem) throw new Error(problem);
}
