import type { Actor, ChatMessage, Message, ToolRun } from '@virtuocity/core';
import { TOOL_USE, defineSettings, describeToolRun, z } from '@virtuocity/core';

export const conversationSettings = defineSettings({
  length: z
    .enum(['short', 'medium', 'long'])
    .default('medium')
    .describe('How much the actor writes per turn'),
});

export type ConversationSettings = z.output<typeof conversationSettings>;

const LENGTH: Record<ConversationSettings['length'], string> = {
  short: 'Keep each contribution to one to three sentences.',
  medium: 'Keep each contribution to about one paragraph.',
  long: 'Contributions may run to a few paragraphs.',
};

/** Plain text of a message, with tool calls as one line each; other parts are left out. */
export function messageText(message: Message): string {
  return message.parts
    .flatMap((p) => {
      if (p.kind === 'text') return [String(p.data)];
      if (p.kind === TOOL_USE) return [describeToolRun(p.data as ToolRun)];
      return [];
    })
    .join('\n');
}

export function systemPrompt(
  actor: Actor,
  others: readonly Actor[],
  settings: ConversationSettings = conversationSettings.parse({}),
): string {
  const cast = others.map((a) => a.personality.name).join(', ') || 'nobody else yet';
  return [
    `You are ${actor.personality.name}, a character in a collaborative roleplay.`,
    actor.personality.description,
    `Others in the scene: ${cast}.`,
    `Stay in character. Write only ${actor.personality.name}'s next contribution, without a name prefix, and never speak or act for other characters.`,
    LENGTH[settings.length],
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
  settings?: ConversationSettings,
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
  return [{ role: 'system', content: systemPrompt(actor, others, settings) }, ...turns];
}
