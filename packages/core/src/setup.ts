import { z } from 'zod';
import type { Actor } from './actor';
import type { Blueprint } from './blueprint';
import { defineDocType } from './doc-type';
import { defineEvent } from './events';
import type { SavedSetup } from './library';
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

/**
 * A new session has begun and its first cast has joined. Fired once, when a
 * session is started (not when a saved one is loaded), so actors can open it:
 * deliver a premise, set the scene, start the music.
 */
export const sessionStarted = defineEvent<{ readonly blueprintId?: string }>('session.started');

type Session = Pick<SessionRuntime, 'workspace' | 'join' | 'bus'>;

async function castAndStart(session: Session, actors: readonly Actor[], blueprintId?: string) {
  for (const actor of actors) await session.join(actor);
  await session.bus.emit(sessionStarted.create(blueprintId === undefined ? {} : { blueprintId }));
}

/** Records the blueprint, casts its actors into the session and starts it. */
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
  await castAndStart(session, actors, blueprint.id);
}

/** The blueprint the session was started from, if it is still installed. */
export function currentBlueprint(
  session: Pick<SessionRuntime, 'workspace'>,
  blueprints: Registry<Blueprint>,
): Blueprint | undefined {
  const { blueprintId } = session.workspace.read(SETUP, setupDoc);
  return blueprintId === undefined ? undefined : blueprints.find(blueprintId);
}

/** Casts and starts a saved setup, using the layout of the blueprint it came from when installed. */
export async function startSavedSetup(
  session: Session,
  setup: SavedSetup,
  blueprints: Registry<Blueprint>,
): Promise<void> {
  const blueprint =
    setup.blueprintId === undefined ? undefined : blueprints.find(setup.blueprintId);
  if (blueprint) return startBlueprint(session, blueprint, setup.actors);
  await castAndStart(session, setup.actors);
}
