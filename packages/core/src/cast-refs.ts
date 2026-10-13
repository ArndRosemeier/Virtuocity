import type { ActorLookup, CastOp } from './cast';
import { CAST, castDoc } from './cast';
import type { Operation } from './oplog';
import type { SavedSession } from './persistence';
import type { SessionRuntime } from './runtime';

const castOp = (op: Operation) => (op.docId === CAST ? (op.payload as CastOp) : undefined);

/**
 * Turns the copies a session holds of actors the lookup knows into includes of
 * them, on every branch. A session loaded from a file (or saved by an older
 * version) holds copies; once those actors are in the library, it refers to them.
 */
export async function includeKnownActors(
  session: Pick<SessionRuntime, 'workspace' | 'lookup'>,
): Promise<void> {
  const { log } = session.workspace;
  let changed = false;
  const operations = log.all().map((op) => {
    const cast = castOp(op);
    if (cast?.type !== 'join' || !session.lookup(cast.actor.id)) return op;
    changed = true;
    const payload: CastOp = { type: 'include', actorId: cast.actor.id };
    return { ...op, payload, docVersion: castDoc.version };
  });
  if (changed) await session.workspace.load(operations, log.head);
}

/**
 * The saved session with a copy of every included actor written in, as the
 * lookup has it now, so it stands alone, e.g. in a file for another browser.
 */
export function withActorsWritten(saved: SavedSession, lookup: ActorLookup): SavedSession {
  const operations = saved.operations.map((op) => {
    const cast = castOp(op);
    const actor = cast?.type === 'include' ? lookup(cast.actorId) : undefined;
    if (!actor) return op;
    const payload: CastOp = { type: 'join', actor };
    return { ...op, payload, docVersion: castDoc.version };
  });
  return { ...saved, operations };
}
