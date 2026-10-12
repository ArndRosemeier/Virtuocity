import { z } from 'zod';
import type { Actor } from './actor';
import type { ContextContributor } from './context-assembly';
import { defineDocType } from './doc-type';
import type { ProfileField } from './settings';
import { profileValue } from './settings';

export type CastOp =
  | { readonly type: 'join'; readonly actor: Actor }
  | { readonly type: 'leave'; readonly actorId: string };

export interface Cast {
  readonly actors: readonly Actor[];
}

const actor = z.object({
  id: z.string(),
  controller: z.enum(['human', 'ai']),
  personality: z.object({ name: z.string(), description: z.string() }),
  skillIds: z.array(z.string()),
  models: z.record(z.string(), z.string()).optional(),
  settings: z.record(z.string(), z.unknown()).optional(),
  profile: z.record(z.string(), z.unknown()).optional(),
});

/**
 * Who is in the session. Joining and leaving are operations like any other,
 * so the cast rewinds, branches and saves together with the story.
 */
export const castDoc = defineDocType<Cast, CastOp>({
  id: 'cast',
  version: 1,
  description: 'The actors in the session. Joining again updates an actor.',
  op: z.discriminatedUnion('type', [
    z.object({ type: z.literal('join'), actor }),
    z.object({ type: z.literal('leave'), actorId: z.string() }),
  ]),
  initial: () => ({ actors: [] }),
  apply: (state, op) => {
    const others = state.actors.filter(
      (a) => a.id !== (op.type === 'join' ? op.actor.id : op.actorId),
    );
    return { actors: op.type === 'join' ? [...others, op.actor] : others };
  },
});

/** The document id of a session's cast. */
export const CAST = 'cast';

/**
 * Who is present and what anyone could see of them: names and profile fields.
 * Personality descriptions stay private to each actor, since they can hold secrets.
 */
export function castContributor(fields: () => readonly ProfileField[]): ContextContributor {
  return {
    id: 'cast',
    contribute: ({ actor, actors }) => {
      const lines = actors
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
