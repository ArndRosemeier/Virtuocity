import { CAST } from './cast';
import type { OpLog, Operation } from './oplog';
import { SETUP } from './setup';
import type { Workspace } from './workspace';

/** Joining, leaving and closing the guide arrange a session; nobody builds on them. */
const arranges = (op: Operation) => op.docId === CAST || op.docId === SETUP;

/**
 * What an actor did in a session (beyond joining), when nobody built on it:
 * no other actor changed anything after it, on any branch. Undefined when
 * someone did, since taking the actor's part out would change their history.
 */
export function ownTraces(log: OpLog, actorId: string): Operation[] | undefined {
  const all = log.all();
  const mine = all.filter((op) => op.actorId === actorId && !arranges(op));
  const below = (op: Operation): Operation[] =>
    all.filter((o) => o.parentId === op.id).flatMap((o) => [o, ...below(o)]);
  const builtOn = mine.some((op) => below(op).some((o) => o.actorId !== actorId && !arranges(o)));
  return builtOn ? undefined : mine;
}

/**
 * Takes an actor out of a session without a trace: what it did goes, then it
 * leaves. Returns false, changing nothing, when someone built on its work.
 */
export async function withdraw(
  session: { readonly workspace: Workspace; leave(actorId: string): Promise<void> },
  actorId: string,
): Promise<boolean> {
  const traces = ownTraces(session.workspace.log, actorId);
  if (!traces) return false;
  if (traces.length > 0) await session.workspace.excise(traces.map((op) => op.id));
  await session.leave(actorId);
  return true;
}

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
