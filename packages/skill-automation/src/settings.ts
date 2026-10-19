import type { Message } from '@virtuocity/core';
import { defineSettings, z } from '@virtuocity/core';

const EXAMPLE = `// name = LLM("...") keeps the answer in a variable; [name] puts it into a later prompt.
// A bare LLM("...") adds its answer to the one message this actor posts.
// [context] is the story so far. Variables starting with _ keep their value between runs.
mood = LLM("Name the mood of this story in one word.

[context]")
LLM("Suggest one short twist that fits a [mood] mood.")`;

export const automationSettings = defineSettings({
  script: z
    .string()
    .max(20000)
    .default(EXAMPLE)
    .describe(
      'The script. name = LLM("...") keeps an answer, a bare LLM("...") adds it to the post, [name] puts a value into a prompt, [[ is a plain [, [context] is the story so far, names starting with _ keep their value between runs, // starts a comment',
    ),
  every: z
    .number()
    .int()
    .min(1)
    .max(20)
    .default(1)
    .describe('Run after every this many messages from others'),
  automatic: z
    .boolean()
    .default(false)
    .describe(
      "Run on its own after other actors' turns. When off, it runs only when you click it under 'or ask:'",
    ),
});

/**
 * Whether it is time to run after `actorId`'s turn: the newest message is
 * theirs, and every `every` messages from others since this automation last posted.
 */
export function due(
  transcript: readonly Message[],
  automationId: string,
  actorId: string,
  every: number,
): boolean {
  if (actorId === automationId || transcript.at(-1)?.actorId !== actorId) return false;
  const lastOwn = transcript.findLastIndex((m) => m.actorId === automationId);
  const since = transcript.slice(lastOwn + 1).filter((m) => m.text.trim() !== '').length;
  return since > 0 && since % every === 0;
}
