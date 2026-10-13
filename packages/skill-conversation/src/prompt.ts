import type { Actor, ChatMessage, Message } from '@virtuocity/core';
import { pictureLabels } from './pictures';
import {
  actorName,
  chatText,
  defineSettings,
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
    .optional()
    .describe(
      'How many tokens of story and background the actor reads each turn. Leave empty to read everything',
    ),
});

/** Background knowledge gets at most this share of a limited memory; the story gets the rest. */
export const CONTEXT_SHARE = 0.25;

/** The token budget for background knowledge: unlimited unless the actor's memory is. */
export const contextBudget = (settings: ConversationSettings): number =>
  settings.memory === undefined ? Infinity : Math.floor(settings.memory * CONTEXT_SHARE);

export type ConversationSettings = z.output<typeof conversationSettings>;

const LENGTH: Record<ConversationSettings['length'], string> = {
  short: 'Keep each contribution to one to three sentences.',
  medium: 'Keep each contribution to about one paragraph.',
  long: 'Contributions may run to a few paragraphs.',
};

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
  /** Who is in the scene; support actors are left out. Defaults to everyone in `actors`. */
  readonly cast?: readonly Actor[];
  /** The picture the session works on, shown to the model last (see `lookAt`). */
  readonly picture?: ChatMessage;
}

/**
 * The story so far from the speaker's point of view: their own lines are
 * `assistant`, everyone else's are `user` lines prefixed with the speaker name.
 * With a memory limit, older lines are left out once it is full; without one, all are kept.
 */
export function buildPrompt(
  actor: Actor,
  actors: readonly Actor[],
  history: readonly Message[],
  options: PromptOptions = {},
): ChatMessage[] {
  const settings = options.settings ?? conversationSettings.parse({});
  const nameOf = (id: string) => actorName(actors, id);
  const others = (options.cast ?? actors).filter((a) => a.id !== actor.id);
  const system = systemPrompt(actor, others, settings, options.context);
  const labels = pictureLabels(history);
  const said = (m: Message) => labels.get(m.id) ?? m.text;
  const turns = history
    .filter((m) => m.text.trim() !== '')
    .map((m): ChatMessage =>
      m.actorId === actor.id
        ? { role: 'assistant', content: said(m) }
        : { role: 'user', content: `${nameOf(m.actorId)}: ${said(m)}` },
    );
  const kept =
    settings.memory === undefined
      ? turns
      : fitNewest(turns, settings.memory - estimateTokens(system), (m) =>
          estimateTokens(chatText(m.content)),
        );
  return [
    { role: 'system', content: system },
    ...kept,
    ...(options.picture ? [options.picture] : []),
  ];
}
