import { z } from 'zod';
import type { Actor } from './actor';
import { defineDocType } from './doc-type';

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
