import type { Actor, ChatMessage } from '@virtuocity/core';
import type { PromptedPremiseSettings } from './settings';

/** Asks for a premise that sets the story up for this cast without deciding anything for them. */
export function premisePrompt(
  author: Actor,
  actors: readonly Actor[],
  settings: PromptedPremiseSettings,
): ChatMessage[] {
  const cast = actors
    .filter((a) => a.id !== author.id)
    .map((a) => `- ${a.personality.name}: ${a.personality.description}`.trim())
    .join('\n');
  const system = [
    'You write the premise that opens a collaborative story.',
    author.personality.description,
    'Describe the setting, the situation the characters are in, and the hook that sets things moving. Never decide what anyone does next.',
    `Write about ${settings.words} words of plain prose. No title, no preamble.`,
  ]
    .filter(Boolean)
    .join('\n\n');
  const request = [
    `The premise should be about: ${settings.prompt}`,
    cast && `Who is in the story:\n${cast}`,
  ];
  return [
    { role: 'system', content: system },
    { role: 'user', content: request.filter(Boolean).join('\n\n') },
  ];
}
