import { CAST } from './cast';
import type { Operation } from './oplog';
import { SETUP } from './setup';
import type { Workspace } from './workspace';

/** Joining, leaving and closing the guide arrange a session; nobody builds on them. */
const arranges = (op: Operation) => op.docId === CAST || op.docId === SETUP;

/**
 * Empties a session: who is in it and how it was set up stay, everything that
 * happened goes, on every branch. Its next step opens it afresh, e.g. with a
 * premise as it is then.
 */
export async function clearSession(session: { readonly workspace: Workspace }): Promise<void> {
  const kept = session.workspace.log.path().filter(arranges);
  const chained = kept.map((op, i) => ({ ...op, parentId: kept[i - 1]?.id ?? null }));
  await session.workspace.load(chained, chained.at(-1)?.id ?? null);
}
