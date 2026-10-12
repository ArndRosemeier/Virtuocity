import type { Actor, ChatMessage } from '@virtuocity/core';
import { defineSettings, z } from '@virtuocity/core';

export const reviewerSettings = defineSettings({
  strictness: z
    .enum(['gentle', 'balanced', 'strict'])
    .default('balanced')
    .describe('How high the bar is before a text counts as ready'),
});

export type Strictness = z.output<typeof reviewerSettings>['strictness'];

const BAR: Record<Strictness, string> = {
  gentle: 'Be encouraging. Approve once the text works, even if it could be polished further.',
  balanced: 'Approve when the text is solid and has no real problems left.',
  strict: 'Hold a high bar. Approve only text you would publish as it is.',
};

/** Asks for exactly one JSON value matching `schema`, in the reviewer's own voice. */
export function reviewPrompt(
  actor: Actor,
  job: { readonly task: string; readonly strictness?: Strictness },
  input: { readonly text: string; readonly focus?: string | undefined },
  schema: z.ZodType,
): ChatMessage[] {
  const { task, strictness = 'balanced' } = job;
  const system = [
    `You are ${actor.personality.name}, reviewing writing.`,
    actor.personality.description,
    task,
    BAR[strictness],
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
