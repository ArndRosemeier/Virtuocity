import type { Actor, ChatMessage } from '@virtuocity/core';
import { z } from '@virtuocity/core';

/** Asks for exactly one JSON value matching `schema`, in the reviewer's own voice. */
export function reviewPrompt(
  actor: Actor,
  task: string,
  input: { readonly text: string; readonly focus?: string | undefined },
  schema: z.ZodType,
): ChatMessage[] {
  const system = [
    `You are ${actor.personality.name}, reviewing writing.`,
    actor.personality.description,
    task,
    'Quote passages exactly as they appear in the text.',
    `Answer with one JSON value only, no prose around it, matching this JSON Schema:\n${JSON.stringify(z.toJSONSchema(schema))}`,
  ]
    .filter(Boolean)
    .join('\n\n');
  const focus = input.focus ? `Focus on: ${input.focus}\n\n` : '';
  return [
    { role: 'system', content: system },
    { role: 'user', content: `${focus}Text:\n"""\n${input.text}\n"""` },
  ];
}
