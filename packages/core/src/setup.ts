import { z } from 'zod';
import type { Actor } from './actor';
import type { Blueprint } from './blueprint';
import { defineDocType } from './doc-type';
import type { EventBus } from './events';
import { defineEvent } from './events';
import type { SavedSetup } from './library';
import type { Registry } from './registry';
import type { SessionRuntime } from './runtime';

export interface Setup {
  /** The blueprint the session was started from, if any. */
  readonly blueprintId?: string;
  /** The setup guide was closed for this session. */
  readonly guideHidden?: boolean;
}

export type SetupOp =
  | { readonly type: 'use-blueprint'; readonly blueprintId: string }
  | { readonly type: 'hide-guide' };

/** How the session was set up. Kept in the log, so it saves and loads with the story. */
export const setupDoc = defineDocType<Setup, SetupOp>({
  id: 'setup',
  version: 1,
  description:
    'How the session was set up: the blueprint it started from, whether its guide shows.',
  op: z.discriminatedUnion('type', [
    z.object({ type: z.literal('use-blueprint'), blueprintId: z.string() }),
    z.object({ type: z.literal('hide-guide') }),
  ]),
  initial: () => ({}),
  apply: (state, op) =>
    op.type === 'hide-guide' ? { ...state, guideHidden: true } : { blueprintId: op.blueprintId },
});

/** The document id of a session's setup. */
export const SETUP = 'setup';

/**
 * A new session has begun and its first cast has joined. Fired once, when a
 * session is started (not when a saved one is loaded), so actors can open it:
 * deliver a premise, set the scene, start the music.
 */
export const sessionStarted = defineEvent<{ readonly blueprintId?: string }>('session.started');

const starting = new WeakSet<EventBus>();

/**
 * Whether the session on this bus is starting: its first cast is joining and
 * `sessionStarted` follows. Actors that react to joining can wait for the start.
 */
export function isStarting(bus: EventBus): boolean {
  return starting.has(bus);
}

type Session = Pick<SessionRuntime, 'workspace' | 'join' | 'bus'>;

async function castAndStart(session: Session, actors: readonly Actor[], blueprintId?: string) {
  starting.add(session.bus);
  try {
    for (const actor of actors) await session.join(actor);
  } finally {
    starting.delete(session.bus);
  }
  await session.bus.emit(sessionStarted.create(blueprintId === undefined ? {} : { blueprintId }));
}

/** Records the blueprint and starts the session with these actors (none by default). */
export async function startBlueprint(
  session: Session,
  blueprint: Blueprint,
  actors: readonly Actor[] = [],
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

/** Closes the setup guide for this session. */
export function hideGuide(session: Pick<SessionRuntime, 'workspace'>): Promise<unknown> {
  return session.workspace.change({
    actorId: 'user',
    docId: SETUP,
    docType: setupDoc,
    payload: { type: 'hide-guide' },
  });
}

/**
 * Starts a saved setup with its actors, as the library holds them, using the
 * layout of the blueprint it came from when installed.
 */
export async function startSavedSetup(
  session: Session,
  setup: SavedSetup,
  library: readonly Actor[],
  blueprints: Registry<Blueprint>,
): Promise<void> {
  const actors = setup.actorIds.flatMap((id) => library.find((a) => a.id === id) ?? []);
  const blueprint =
    setup.blueprintId === undefined ? undefined : blueprints.find(setup.blueprintId);
  if (blueprint) return startBlueprint(session, blueprint, actors);
  await castAndStart(session, actors);
}
