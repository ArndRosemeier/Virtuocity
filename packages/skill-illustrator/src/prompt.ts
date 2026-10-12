import type { Actor, ChatMessage, Message } from '@virtuocity/core';
import { defineProfileField, defineSettings, profileValue, z } from '@virtuocity/core';

export const illustratorSettings = defineSettings({
  style: z
    .string()
    .max(500)
    .default('')
    .describe('House style for every picture, e.g. ink sketch or soft watercolour'),
  every: z
    .number()
    .int()
    .min(1)
    .max(20)
    .default(1)
    .describe('Paint after every this many messages from others'),
  inStory: z
    .boolean()
    .default(true)
    .describe('Also post each picture into the story; it always shows as the scene'),
});

export type IllustratorSettings = z.output<typeof illustratorSettings>;

/** How an actor looks, so pictures of them stay consistent. */
export const appearanceField = defineProfileField({
  id: 'appearance',
  label: 'Appearance',
  description: 'How this actor looks. Illustrators use it to draw them consistently.',
  schema: z.string().max(1000),
});

export interface IllustrateRequest {
  readonly description: string;
  readonly style?: string | undefined;
}

/** Appearance notes for the actors a scene mentions by name. */
export function appearances(actors: readonly Actor[], text: string): string[] {
  const lower = text.toLowerCase();
  return actors.flatMap((actor) => {
    const looks = profileValue(actor, appearanceField)?.trim();
    const named = lower.includes(actor.personality.name.toLowerCase());
    return looks && named ? [`${actor.personality.name}: ${looks}`] : [];
  });
}

/** The image model's instructions; settings and the illustrator's description set the style. */
export function illustratePrompt(
  illustrator: Actor,
  actors: readonly Actor[],
  request: IllustrateRequest,
  settings: IllustratorSettings,
): ChatMessage[] {
  const style = [request.style, settings.style, illustrator.personality.description]
    .filter(Boolean)
    .join('. ');
  const people = appearances(actors, request.description);
  const content = [
    'Draw one picture of the following. No text or lettering in the picture.',
    style && `Style: ${style}`,
    people.length > 0 && `How the people in it look:\n${people.join('\n')}`,
    `Subject:\n${request.description}`,
  ];
  return [{ role: 'user', content: content.filter(Boolean).join('\n\n') }];
}

const textOf = (message: Message) =>
  message.parts
    .filter((p) => p.kind === 'text')
    .map((p) => String(p.data))
    .join('\n')
    .trim();

/**
 * The scene to paint after `actorId`'s turn, or `undefined` when it is not
 * time yet: only every `every` messages from others since the last picture.
 */
export function sceneToPaint(
  transcript: readonly Message[],
  illustratorId: string,
  actorId: string,
  every: number,
): string | undefined {
  const last = transcript.at(-1);
  if (!last || last.actorId !== actorId) return undefined;
  const text = textOf(last);
  if (!text) return undefined;
  let since = 0;
  for (let i = transcript.length - 1; i >= 0; i--) {
    const message = transcript[i];
    if (!message || message.actorId === illustratorId) break;
    if (textOf(message)) since++;
  }
  return since % every === 0 ? text : undefined;
}
