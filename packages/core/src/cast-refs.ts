import type { Actor } from './actor';
import { nameKey } from './actor-names';
import type { ActorLookup, CastOp } from './cast';
import { CAST, castDoc } from './cast';
import type { OpLog, Operation } from './oplog';
import type { SavedSession } from './persistence';
import type { Workspace } from './workspace';

const castOp = (op: Operation) => (op.docId === CAST ? (op.payload as CastOp) : undefined);

/**
 * Turns the copies a session holds of actors the lookup knows into includes of
 * them, on every branch. A session loaded from a file (or saved by an older
 * version) holds copies; once those actors are in the library, it refers to them.
 */
export async function includeKnownActors(session: {
  readonly workspace: Workspace;
  readonly lookup: ActorLookup;
}): Promise<void> {
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

/**
 * The copies of library actors among these operations: actors a session keeps
 * itself that have a library actor's id or name. One name is one actor, so
 * outside a file this must always be empty; tests check it.
 */
export function actorCopies(operations: readonly Operation[], library: readonly Actor[]): Actor[] {
  const ids = new Set(library.map((a) => a.id));
  const names = new Set(library.map((a) => nameKey(a.personality.name)));
  return operations.flatMap((op) => {
    const cast = castOp(op);
    if (cast?.type !== 'join') return [];
    const { actor } = cast;
    return ids.has(actor.id) || names.has(nameKey(actor.personality.name)) ? [actor] : [];
  });
}

/**
 * Everyone who ever was in a session, on any branch: who is in it now, and
 * actors that left or are only on another branch, as the lookup has them. What
 * an actor did stays when it leaves, so its posts still need its name, and the
 * session still uses it: deleting it from the library deletes the session.
 */
export function everyone(session: {
  readonly workspace: { readonly log: OpLog };
  readonly lookup: ActorLookup;
  readonly actors: readonly Actor[];
}): readonly Actor[] {
  const now = new Set(session.actors.map((a) => a.id));
  const before = new Map<string, Actor>();
  for (const op of session.workspace.log.all()) {
    const cast = castOp(op);
    const actor =
      cast?.type === 'join'
        ? cast.actor
        : cast?.type === 'include'
          ? session.lookup(cast.actorId)
          : undefined;
    if (actor && !now.has(actor.id)) before.set(actor.id, actor);
  }
  return [...session.actors, ...before.values()];
}
