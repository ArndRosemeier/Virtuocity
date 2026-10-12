import type { Actor, ChatMessage, Message, ToolRun } from '@virtuocity/core';
import {
  TOOL_USE,
  defineSettings,
  describeToolRun,
  estimateTokens,
  fitNewest,
  z,
} from '@virtuocity/core';

export const conversationSettings = defineSettings({
  length: z
    .enum(['short', 'medium', 'long'])
    .default('medium')
    .describe('How much the actor writes per turn'),
  memory: z
    .number()
    .int()
    .min(1000)
    .max(200000)
    .default(8000)
    .describe('How many tokens of story and background the actor reads each turn'),
});

/** Background knowledge gets at most this share of the actor's memory; the story gets the rest. */
export const CONTEXT_SHARE = 0.25;

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
  context = '',
): string {
  const cast = others.map((a) => a.personality.name).join(', ') || 'nobody else yet';
  return [
    `You are ${actor.personality.name}, a character in a collaborative roleplay.`,
    actor.personality.description,
    `Others in the scene: ${cast}.`,
    `Stay in character. Write only ${actor.personality.name}'s next contribution, without a name prefix, and never speak or act for other characters.`,
    LENGTH[settings.length],
    context && `What you know:\n\n${context}`,
  ]
    .filter(Boolean)
    .join('\n\n');
}

export interface PromptOptions {
  readonly settings?: ConversationSettings;
  /** Background knowledge, already fitted to its budget (see `ctx.context`). */
  readonly context?: string;
}

/**
 * The story so far from the speaker's point of view: their own lines are
 * `assistant`, everyone else's are `user` lines prefixed with the speaker name.
 * Older lines are left out once the actor's memory is full.
 */
export function buildPrompt(
  actor: Actor,
  actors: readonly Actor[],
  history: readonly Message[],
  options: PromptOptions = {},
): ChatMessage[] {
  const settings = options.settings ?? conversationSettings.parse({});
  const nameOf = (id: string) => actors.find((a) => a.id === id)?.personality.name ?? id;
  const others = actors.filter((a) => a.id !== actor.id);
  const system = systemPrompt(actor, others, settings, options.context);
  const turns = history
    .map((m): ChatMessage => {
      const text = messageText(m);
      return m.actorId === actor.id
        ? { role: 'assistant', content: text }
        : { role: 'user', content: `${nameOf(m.actorId)}: ${text}` };
    })
    .filter((m) => m.content.trim() !== '');
  const room = settings.memory - estimateTokens(system);
  const kept = fitNewest(turns, room, (m) => estimateTokens(m.content));
  return [{ role: 'system', content: system }, ...kept];
}
