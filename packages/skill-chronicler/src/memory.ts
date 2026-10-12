import type { ContextContributor, StateView } from '@virtuocity/core';
import { defineDocType, z } from '@virtuocity/core';

/** One chronicler's summary, and the last message it covers. */
export interface Chronicle {
  readonly summary: string;
  readonly upTo: string;
  readonly at: number;
}

export interface MemoryState {
  /** By chronicler actor id, so several chroniclers can keep their own. */
  readonly chronicles: Readonly<Record<string, Chronicle>>;
}

export type MemoryOp =
  | {
      readonly type: 'set';
      readonly chroniclerId: string;
      readonly summary: string;
      readonly upTo: string;
    }
  | { readonly type: 'forget'; readonly chroniclerId: string };

/**
 * What the actors remember of the story beyond what they can read. Only model
 * calls use it; the story itself is never shortened. In the log, so it
 * rewinds, branches and saves with the story.
 */
export const memoryDoc = defineDocType<MemoryState, MemoryOp>({
  id: 'memory',
  version: 1,
  description: 'Summaries of the story so far, one per chronicler.',
  op: z.discriminatedUnion('type', [
    z.object({
      type: z.literal('set'),
      chroniclerId: z.string(),
      summary: z.string(),
      upTo: z.string(),
    }),
    z.object({ type: z.literal('forget'), chroniclerId: z.string() }),
  ]),
  initial: () => ({ chronicles: {} }),
  apply: (state, op, meta) => {
    const rest = Object.fromEntries(
      Object.entries(state.chronicles).filter(([id]) => id !== op.chroniclerId),
    );
    if (op.type === 'forget') return { chronicles: rest };
    const chronicle = { summary: op.summary, upTo: op.upTo, at: meta.at };
    return { chronicles: { ...rest, [op.chroniclerId]: chronicle } };
  },
});

/** The document id of a session's memory. */
export const MEMORY = 'memory';

export function chronicles(state: Pick<StateView, 'read'>): MemoryState['chronicles'] {
  return state.read(MEMORY, memoryDoc).chronicles;
}

/** The most recently written summary, whoever wrote it. */
export function latestChronicle(state: Pick<StateView, 'read'>): Chronicle | undefined {
  return Object.values(chronicles(state)).reduce<Chronicle | undefined>(
    (latest, c) => (!latest || c.at >= latest.at ? c : latest),
    undefined,
  );
}

/** Puts the latest summary in front of every actor's model calls. */
export const memoryContributor: ContextContributor = {
  id: 'story-so-far',
  contribute: ({ state }) => {
    const chronicle = latestChronicle(state);
    if (!chronicle) return [];
    return [
      { id: 'story-so-far', title: 'The story so far', text: chronicle.summary, priority: 60 },
    ];
  },
};
