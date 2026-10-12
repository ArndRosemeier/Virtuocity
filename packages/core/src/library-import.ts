import type { Actor } from './actor';
import { nameKey, sameActor } from './actor-names';
import { uniqueNames } from './library-migrate';

/** An incoming actor whose name is already in the library with different details. */
export interface NameConflict {
  readonly incoming: Actor;
  readonly existing: Actor;
}

/** Keep the library's actor, or replace it with the incoming one. */
export type ConflictChoice = 'keep' | 'replace';

/** Asks how to settle name conflicts; answers by incoming actor id. Missing answers keep. */
export type ResolveConflicts = (
  conflicts: readonly NameConflict[],
) => Promise<Readonly<Record<string, ConflictChoice>>>;

/**
 * What to do with one incoming actor. The library always ends up holding it
 * under the incoming id, so whatever refers to that id (a session, a setup)
 * keeps working:
 * - `add`: the name is new.
 * - `link`: the library has the same actor (by id or name); `fromId` is its library id.
 * - `conflict`: the library has the name with different details; the user decides.
 */
export type ImportStep =
  | { readonly type: 'add'; readonly actor: Actor }
  | { readonly type: 'link'; readonly actor: Actor; readonly fromId: string }
  | { readonly type: 'conflict'; readonly incoming: Actor; readonly existing: Actor };

/** Plans how incoming actors join a library, matching them by name, then by id. */
export function planImport(existing: readonly Actor[], incoming: readonly Actor[]): ImportStep[] {
  return uniqueNames(incoming).map((actor) => {
    const match =
      existing.find((e) => nameKey(e.personality.name) === nameKey(actor.personality.name)) ??
      existing.find((e) => e.id === actor.id);
    if (!match) return { type: 'add', actor };
    if (sameActor(match, actor)) return { type: 'link', actor, fromId: match.id };
    return { type: 'conflict', incoming: actor, existing: match };
  });
}

/** The actor the library keeps for a step, under the incoming id. */
export function settle(step: ImportStep, choice: ConflictChoice = 'keep'): Actor {
  if (step.type !== 'conflict') return step.actor;
  return choice === 'replace' ? step.incoming : { ...step.existing, id: step.incoming.id };
}
