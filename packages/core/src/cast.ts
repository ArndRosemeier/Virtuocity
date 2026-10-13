import { z } from 'zod';
import type { Actor, OwnActor } from './actor';
import type { ContextContributor } from './context-assembly';
import { defineDocType } from './doc-type';
import type { ProfileField } from './settings';
import { profileValue } from './settings';

/**
 * `join` puts an actor the session owns into the cast, kept in the operation
 * (e.g. the person, the story view). `include` puts in an actor kept elsewhere,
 * by id: a library actor. The session never holds a copy of it, so editing it
 * in the library changes it in every session, and rewinding never brings back
 * an older version.
 */
export type CastOp =
  | { readonly type: 'join'; readonly actor: OwnActor }
  | { readonly type: 'include'; readonly actorId: string }
  | { readonly type: 'leave'; readonly actorId: string };

/** One cast member: an actor the session owns, or the id of one kept elsewhere. */
export interface CastMember {
  readonly id: string;
  readonly actor?: Actor;
}

export interface Cast {
  readonly members: readonly CastMember[];
}

/** Finds an actor kept outside the session (in the library) by id. */
export type ActorLookup = (id: string) => Actor | undefined;

/** Validates a stored or imported actor. */
export const actorSchema = z.object({
  id: z.string(),
  controller: z.enum(['human', 'ai']),
  personality: z.object({ name: z.string(), description: z.string() }),
  skillIds: z.array(z.string()),
  models: z.record(z.string(), z.string()).optional(),
  settings: z.record(z.string(), z.unknown()).optional(),
  profile: z.record(z.string(), z.unknown()).optional(),
});

const memberOf = (op: CastOp): CastMember | undefined =>
  op.type === 'join'
    ? { id: op.actor.id, actor: op.actor }
    : op.type === 'include'
      ? { id: op.actorId }
      : undefined;

/**
 * Who is in the session. Joining and leaving are operations like any other,
 * so the cast rewinds, branches and saves together with the story.
 */
export const castDoc = defineDocType<Cast, CastOp>({
  id: 'cast',
  version: 2,
  description: 'The actors in the session. Joining again updates an actor.',
  op: z.discriminatedUnion('type', [
    z.object({ type: z.literal('join'), actor: actorSchema }),
    z.object({ type: z.literal('include'), actorId: z.string() }),
    z.object({ type: z.literal('leave'), actorId: z.string() }),
  ]),
  initial: () => ({ members: [] }),
  apply: (state, op) => {
    const member = memberOf(op);
    const id = op.type === 'join' ? op.actor.id : op.actorId;
    const others = state.members.filter((m) => m.id !== id);
    return { members: member ? [...others, member] : others };
  },
  // Version 2 added `include`; version 1 operations are valid as they are.
  migrate: (payload) => payload,
});

/** How an actor joins: included by id when the lookup knows it, else kept in the session. */
export const joinOp = (actor: Actor, lookup: ActorLookup): CastOp =>
  lookup(actor.id) ? { type: 'include', actorId: actor.id } : { type: 'join', actor };

/** The cast's actors: its own ones, and the ones it includes as `lookup` finds them now. */
export function castActors(cast: Cast, lookup: ActorLookup): Actor[] {
  return cast.members.flatMap((m) => m.actor ?? lookup(m.id) ?? []);
}

/** The document id of a session's cast. */
export const CAST = 'cast';

/**
 * Who is in the cast and what anyone could see of them: names and profile
 * fields. Support actors (an illustrator, a chronicler) are not in the scene.
 * Personality descriptions stay private to each actor, since they can hold secrets.
 */
export function castContributor(fields: () => readonly ProfileField[]): ContextContributor {
  return {
    id: 'cast',
    contribute: ({ actor, cast }) => {
      const lines = cast
        .filter((a) => a.id !== actor.id)
        .map((a) => {
          const known = fields().flatMap((f) => {
            const value = profileValue(a, f);
            return value === undefined || value === '' ? [] : [`${f.label}: ${String(value)}`];
          });
          return [`- ${a.personality.name}`, ...known.map((k) => `  ${k}`)].join('\n');
        });
      if (lines.length === 0) return [];
      return [{ id: 'cast', title: 'Who is here', text: lines.join('\n'), priority: 80 }];
    },
  };
}
