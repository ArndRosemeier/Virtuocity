import type { ChatMessage, OutputPart } from '@virtuocity/core';

/** What was gathered before, in words; parts that are not text say nothing here. */
const previousText = (parts: readonly OutputPart[]) =>
  parts
    .flatMap((p) => (typeof p.data === 'string' && p.data.trim() !== '' ? [p.data] : []))
    .join('\n\n');

/**
 * The model's instructions: the actor's editable prompt, then the whole session
 * and the facts gathered so far, which a person may have corrected.
 */
export function gatherPrompt(
  prompt: string,
  session: string,
  previous: readonly OutputPart[],
): ChatMessage[] {
  const before = previousText(previous);
  const request = [
    `The session so far:\n"""\n${session || '(nothing has happened yet)'}\n"""`,
    before &&
      `The facts gathered before, possibly corrected by a person. Keep them unless the session now says otherwise:\n"""\n${before}\n"""`,
    'Write the facts now.',
  ];
  return [
    { role: 'system', content: prompt },
    { role: 'user', content: request.filter(Boolean).join('\n\n') },
  ];
}
