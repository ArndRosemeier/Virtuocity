import type { SessionRuntime } from './runtime';

/** The message's author, when it is an actor that takes turns and so can try again. */
export function retryable(session: SessionRuntime, messageId: string): string | undefined {
  const message = session.transcript().find((m) => m.id === messageId);
  if (!message) return undefined;
  return session.speakers().some((a) => a.id === message.actorId) ? message.actorId : undefined;
}

/**
 * Takes a message back and lets its author answer again: all state rewinds to
 * just before the message, so it and everything after it are gone.
 */
export async function retryMessage(session: SessionRuntime, messageId: string): Promise<void> {
  const actorId = retryable(session, messageId);
  if (!actorId) throw new Error('Only a message from an actor that takes turns can be retried.');
  await session.rewindToMessage(messageId, { before: true });
  await session.runTurn(actorId);
}
