import type { StateView } from '@virtuocity/core';
import { defineDocType, z } from '@virtuocity/core';

type Values = Readonly<Record<string, string>>;

export interface KeptState {
  /** By automation actor id, so several automations keep their own. */
  readonly byActor: Readonly<Record<string, Values>>;
}

export interface KeptOp {
  readonly type: 'keep';
  readonly actorId: string;
  readonly values: Values;
}

/**
 * The variables automations keep between runs (those starting with `_`). In
 * the log, so they rewind, branch and save with the session, and a new
 * session starts without them.
 */
export const keptDoc = defineDocType<KeptState, KeptOp>({
  id: 'automation-variables',
  version: 1,
  description: 'Variables automations keep from one run to the next, one set per automation.',
  op: z.object({
    type: z.literal('keep'),
    actorId: z.string(),
    values: z.record(z.string(), z.string()),
  }),
  initial: () => ({ byActor: {} }),
  apply: (state, op) => ({ byActor: { ...state.byActor, [op.actorId]: op.values } }),
});

/** The document id of a session's kept variables. */
export const KEPT = 'automation-variables';

export function keptValues(state: Pick<StateView, 'read'>, actorId: string): Values {
  return state.read(KEPT, keptDoc).byActor[actorId] ?? {};
}

export function keepValues(state: StateView, actorId: string, values: Values): Promise<unknown> {
  return state.change(KEPT, keptDoc, { type: 'keep', actorId, values });
}
