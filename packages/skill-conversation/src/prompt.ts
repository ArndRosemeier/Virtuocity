import type { Actor, ChatMessage, Message } from '@virtuocity/core';

/** Plain text of a message; non-text parts are left to other skills. */
export function messageText(message: Message): string {
  return message.parts
    .filter((p) => p.kind === 'text')
    .map((p) => String(p.data))
    .join('\n');
}

export function systemPrompt(actor: Actor, others: readonly Actor[]): string {
  const cast = others.map((a) => a.personality.name).join(', ') || 'nobody else yet';
  return [
    `You are ${actor.personality.name}, a character in a collaborative roleplay.`,
    actor.personality.description,
    `Others in the scene: ${cast}.`,
    `Stay in character. Write only ${actor.personality.name}'s next contribution, without a name prefix, and never speak or act for other characters.`,
  ]
    .filter(Boolean)
    .join('\n\n');
}

/**
 * The story so far from the speaker's point of view: their own lines are
 * `assistant`, everyone else's are `user` lines prefixed with the speaker name.
 */
export function buildPrompt(
  actor: Actor,
  actors: readonly Actor[],
  history: readonly Message[],
): ChatMessage[] {
  const nameOf = (id: string) => actors.find((a) => a.id === id)?.personality.name ?? id;
  const turns = history
    .map((m): ChatMessage => {
      const text = messageText(m);
      return m.actorId === actor.id
        ? { role: 'assistant', content: text }
        : { role: 'user', content: `${nameOf(m.actorId)}: ${text}` };
    })
    .filter((m) => m.content.trim() !== '');
  const others = actors.filter((a) => a.id !== actor.id);
  return [{ role: 'system', content: systemPrompt(actor, others) }, ...turns];
}
