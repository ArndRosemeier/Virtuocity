import type { ChatMessage } from '@virtuocity/core';

/** Keeps the answer usable as the new input: no preamble, no quotes around it. */
export const ANSWER_ONLY =
  'Answer with the refined text only: no preamble, no comments, no quotes.';

/**
 * The model's messages: the command with the draft appended, and before it,
 * when the actor takes the context, the session so far.
 */
export function refinePrompt(command: string, draft: string, session?: string): ChatMessage[] {
  const system =
    session === undefined
      ? ANSWER_ONLY
      : `${ANSWER_ONLY}\n\nThe session so far, for context:\n"""\n${session || '(nothing has happened yet)'}\n"""`;
  return [
    { role: 'system', content: system },
    { role: 'user', content: `${command}${draft}` },
  ];
}
