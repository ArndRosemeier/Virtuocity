import type { StoryLine } from '@virtuocity/contract-memory';
import type { Actor, ChatMessage } from '@virtuocity/core';

function system(chronicler: Actor): string {
  return [
    `You are ${chronicler.personality.name}, the chronicler of a collaborative story.`,
    'Write a summary that lets the storytellers carry on without rereading the story: who is who, where they are, what has happened, what is still open, and any promises, secrets or debts.',
    'Make it as long as it needs to be: keep every name, place, fact and thread the story may come back to, however long ago it happened. Never drop a detail just to stay short.',
    'Write plain prose in the past tense. No title, no preamble, no commentary.',
  ]
    .filter(Boolean)
    .join('\n\n');
}

const story = (lines: readonly StoryLine[]) =>
  lines.map((l) => `${l.speaker}: ${l.text}`).join('\n\n');

function prompt(chronicler: Actor, request: string): ChatMessage[] {
  return [
    { role: 'system', content: system(chronicler) },
    { role: 'user', content: request },
  ];
}

/** Summarize the whole story from scratch. */
export function fullPrompt(chronicler: Actor, lines: readonly StoryLine[]): ChatMessage[] {
  return prompt(chronicler, `The story so far:\n"""\n${story(lines)}\n"""`);
}

/** Fold what happened since into the last summary. */
export function differentialPrompt(
  chronicler: Actor,
  summary: string,
  lines: readonly StoryLine[],
): ChatMessage[] {
  return prompt(
    chronicler,
    `The summary so far:\n"""\n${summary}\n"""\n\nWhat happened since:\n"""\n${story(lines)}\n"""\n\nWrite the updated summary. Keep everything that may still matter; drop only what the story can no longer come back to.`,
  );
}
