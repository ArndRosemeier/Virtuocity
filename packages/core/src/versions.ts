import type { Operation, OpLog } from './oplog';
import type { SessionRuntime } from './runtime';
import { MAIN_TRANSCRIPT, findPostingOperation } from './transcript';

/** The versions a retried message has: one per answer its author gave in that place. */
export interface MessageVersions {
  /** Which version is shown, counted from 0; versions are oldest first. */
  readonly index: number;
  readonly count: number;
  /** For each version, the head to move to: the newest end of what followed it. */
  readonly heads: readonly string[];
}

const isAppend = (op: Operation) =>
  op.docId === MAIN_TRANSCRIPT && (op.payload as { type?: unknown }).type === 'append';

/** The log as a tree that is cheap to walk: children by parent, each branch's newest end. */
function treeOf(log: OpLog) {
  const kids = new Map<string | null, Operation[]>();
  for (const op of log.all()) kids.set(op.parentId, [...(kids.get(op.parentId) ?? []), op]);
  const ends = new Map<string, Operation>();
  const newestEnd = (op: Operation): Operation => {
    const known = ends.get(op.id);
    if (known) return known;
    let end = op;
    for (const kid of kids.get(op.id) ?? []) {
      const candidate = newestEnd(kid);
      if (end === op || candidate.at > end.at) end = candidate;
    }
    ends.set(op.id, end);
    return end;
  };
  return { kids: (id: string | null) => kids.get(id) ?? [], newestEnd };
}

/**
 * The versions of a message, when it has more than one. Retrying keeps the old
 * answer as a branch; the branches that start right after the message before it
 * are its versions, and each one carries everything that followed it. A message
 * that is not on the current path (e.g. a view not yet redrawn) has none.
 */
export function messageVersions(log: OpLog, messageId: string): MessageVersions | undefined {
  const tree = treeOf(log);
  const path = log.path();
  const posting = findPostingOperation(log, messageId);
  for (let at = posting ? path.indexOf(posting) : -1; at >= 0; at--) {
    const start = path[at];
    const parent = at > 0 ? path[at - 1] : undefined;
    if (!start) return undefined;
    const siblings = tree.kids(start.parentId);
    if (siblings.length > 1) {
      const sorted = [...siblings].sort((a, b) => a.at - b.at);
      const heads = sorted.map((s) => tree.newestEnd(s).id);
      return { index: sorted.indexOf(start), count: sorted.length, heads };
    }
    if (!parent || isAppend(parent)) return undefined;
  }
  return undefined;
}

/** Shows another version of a message, with everything that followed that version. */
export async function showVersion(
  session: SessionRuntime,
  messageId: string,
  index: number,
): Promise<void> {
  const head = messageVersions(session.workspace.log, messageId)?.heads[index];
  if (head === undefined) throw new Error('That version of the message does not exist.');
  await session.workspace.switchTo(head);
}
