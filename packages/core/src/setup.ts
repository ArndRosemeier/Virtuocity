import { z } from 'zod';
import type { Actor } from './actor';
import type { Blueprint } from './blueprint';
import { defineDocType } from './doc-type';
import type { Registry } from './registry';
import type { SessionRuntime } from './runtime';

export interface Setup {
  /** The blueprint the session was started from, if any. */
  readonly blueprintId?: string;
}

export interface SetupOp {
  readonly type: 'use-blueprint';
  readonly blueprintId: string;
}

/** How the session was set up. Kept in the log, so it saves and loads with the story. */
export const setupDoc = defineDocType<Setup, SetupOp>({
  id: 'setup',
  version: 1,
  description: 'How the session was set up, e.g. the blueprint it started from.',
  op: z.object({ type: z.literal('use-blueprint'), blueprintId: z.string() }),
  initial: () => ({}),
  apply: (_state, op) => ({ blueprintId: op.blueprintId }),
});

/** The document id of a session's setup. */
export const SETUP = 'setup';

type Session = Pick<SessionRuntime, 'workspace' | 'join'>;

/** Records the blueprint and casts its actors into the session. */
export async function startBlueprint(
  session: Session,
  blueprint: Blueprint,
  actors: readonly Actor[],
): Promise<void> {
  await session.workspace.change({
    actorId: `blueprint:${blueprint.id}`,
    docId: SETUP,
    docType: setupDoc,
    payload: { type: 'use-blueprint', blueprintId: blueprint.id },
  });
  for (const actor of actors) await session.join(actor);
}

/** The blueprint the session was started from, if it is still installed. */
export function currentBlueprint(
  session: Pick<SessionRuntime, 'workspace'>,
  blueprints: Registry<Blueprint>,
): Blueprint | undefined {
  const { blueprintId } = session.workspace.read(SETUP, setupDoc);
  return blueprintId === undefined ? undefined : blueprints.find(blueprintId);
}
