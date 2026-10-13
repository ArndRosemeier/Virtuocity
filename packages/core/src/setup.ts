import { z } from 'zod';
import type { Actor } from './actor';
import { defineDocType } from './doc-type';
import type { EventBus } from './events';
import { defineEvent } from './events';
import type { SavedSetup } from './library';
import type { SessionRuntime } from './runtime';

export interface Setup {
  /** The setup guide was closed for this session. */
  readonly guideHidden?: boolean;
}

/** `use-blueprint` is only in sessions saved before session types; it changes nothing now. */
export type SetupOp =
  | { readonly type: 'hide-guide' }
  | { readonly type: 'use-blueprint'; readonly blueprintId: string };

/** How the session was set up. Kept in the log, so it saves and loads with the session. */
export const setupDoc = defineDocType<Setup, SetupOp>({
  id: 'setup',
  version: 1,
  description: 'How the session was set up: whether its guide shows.',
  op: z.discriminatedUnion('type', [
    z.object({ type: z.literal('hide-guide') }),
    z.object({ type: z.literal('use-blueprint'), blueprintId: z.string() }),
  ]),
  initial: () => ({}),
  apply: (state, op) => (op.type === 'hide-guide' ? { ...state, guideHidden: true } : state),
});

/** The document id of a session's setup. */
export const SETUP = 'setup';

/**
 * A new session has begun and its first cast has joined. Fired once, when a
 * session is started (not when a saved one is loaded), so actors can open it:
 * deliver a premise, set the scene, start the music.
 */
export const sessionStarted = defineEvent<Record<string, never>>('session.started');

const starting = new WeakSet<EventBus>();

/**
 * Whether the session on this bus is starting: its first cast is joining and
 * `sessionStarted` follows. Actors that react to joining can wait for the start.
 */
export function isStarting(bus: EventBus): boolean {
  return starting.has(bus);
}

type Session = Pick<SessionRuntime, 'join' | 'bus'>;

/** Starts the session: these actors join (a session type usually first), then `sessionStarted`. */
export async function startSession(session: Session, actors: readonly Actor[]): Promise<void> {
  starting.add(session.bus);
  try {
    for (const actor of actors) await session.join(actor);
  } finally {
    starting.delete(session.bus);
  }
  await session.bus.emit(sessionStarted.create({}));
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

/** Starts a saved setup with its actors, as the library holds them. */
export function startSavedSetup(
  session: Session,
  setup: SavedSetup,
  library: readonly Actor[],
): Promise<void> {
  return startSession(
    session,
    setup.actorIds.flatMap((id) => library.find((a) => a.id === id) ?? []),
  );
}
