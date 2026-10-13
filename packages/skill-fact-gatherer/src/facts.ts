import type { OutputPart, StateView } from '@virtuocity/core';
import { defineDocType, outputPartSchema, z } from '@virtuocity/core';

export interface FactsState {
  /** What each fact gatherer has gathered, by actor id. */
  readonly gathered: Readonly<Record<string, readonly OutputPart[]>>;
}

export interface FactsOp {
  readonly actorId: string;
  readonly parts: readonly OutputPart[];
}

/** The gathered facts. In the log, so they rewind, branch and save with the session. */
export const factsDoc = defineDocType<FactsState, FactsOp>({
  id: 'facts',
  version: 1,
  description: 'The facts each fact gatherer has gathered.',
  op: z.object({ actorId: z.string(), parts: z.array(outputPartSchema) }),
  initial: () => ({ gathered: {} }),
  apply: (state, op) => ({ gathered: { ...state.gathered, [op.actorId]: op.parts } }),
});

export const FACTS = 'facts';

export function gatheredFacts(state: Pick<StateView, 'read'>, actorId: string): OutputPart[] {
  return [...(state.read(FACTS, factsDoc).gathered[actorId] ?? [])];
}
