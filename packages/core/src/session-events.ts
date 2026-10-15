import type { EventBus } from './events';
import { defineEvent } from './events';
import type { Message } from './transcript';

/** What happens in a running session, on its bus (see `SessionRuntime`). */
export const actorJoined = defineEvent<{ readonly actorId: string }>('actor.joined');
export const actorLeft = defineEvent<{ readonly actorId: string }>('actor.left');
export const messagePosted = defineEvent<{ readonly messageId: string }>('message.posted');
export const turnStarted = defineEvent<{ readonly actorId: string }>('turn.started');
export const turnEnded = defineEvent<{ readonly actorId: string }>('turn.ended');

/**
 * The session's first step is about to happen: nothing is in it yet, and
 * someone is about to post, take a turn or run a flow. Actors that open a
 * session (a premise) do it now, as they are at this moment, so editing them
 * before anything happens still counts. Fires again if the session is rewound
 * to empty.
 */
export const firstStep = defineEvent<Record<string, never>>('session.first-step');

const beginning = new WeakSet<EventBus>();

/**
 * Fires `firstStep` when the session is still empty, waiting for its listeners.
 * Called before every post, turn and flow run; what the listeners post doesn't
 * fire it again.
 */
export async function beginIfEmpty(session: {
  readonly bus: EventBus;
  transcript(): readonly Message[];
}): Promise<void> {
  if (beginning.has(session.bus) || session.transcript().length > 0) return;
  beginning.add(session.bus);
  try {
    await session.bus.emit(firstStep.create({}));
  } finally {
    beginning.delete(session.bus);
  }
}
