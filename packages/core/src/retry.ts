import type { SessionRuntime } from './runtime';

/** The message's author, when it is an actor that takes turns (or acts on request) and so can try again. */
export function retryable(session: SessionRuntime, messageId: string): string | undefined {
  const message = session.transcript().find((m) => m.id === messageId);
  if (!message) return undefined;
  const actors = [...session.speakers(), ...session.askable()];
  return actors.some((a) => a.id === message.actorId) ? message.actorId : undefined;
}

/**
 * Lets a message's author answer again: all state rewinds to just before the
 * message. The old answer and everything after it stay as an earlier version
 * (see `versions.ts`), so the person can go back to it.
 */
export async function retryMessage(session: SessionRuntime, messageId: string): Promise<void> {
  const actorId = retryable(session, messageId);
  if (!actorId) throw new Error('Only a message from an actor that takes turns can be retried.');
  await session.rewindToMessage(messageId, { before: true, keepBranch: true });
  await session.runTurn(actorId);
}
