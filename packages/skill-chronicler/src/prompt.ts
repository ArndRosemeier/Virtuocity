import type { StoryLine } from '@virtuocity/contract-memory';
import type { Actor, ChatMessage } from '@virtuocity/core';

function system(chronicler: Actor, words: number): string {
  return [
    `You are ${chronicler.personality.name}, the chronicler of a collaborative story.`,
    chronicler.personality.description,
    'Write a summary that lets the storytellers carry on without rereading the story: who is who, where they are, what has happened, what is still open, and any promises, secrets or debts.',
    `Write about ${words} words of plain prose in the past tense. No title, no preamble, no commentary.`,
  ]
    .filter(Boolean)
    .join('\n\n');
}

const story = (lines: readonly StoryLine[]) =>
  lines.map((l) => `${l.speaker}: ${l.text}`).join('\n\n');

function prompt(chronicler: Actor, words: number, request: string): ChatMessage[] {
  return [
    { role: 'system', content: system(chronicler, words) },
    { role: 'user', content: request },
  ];
}

/** Summarize the whole story from scratch. */
export function fullPrompt(
  chronicler: Actor,
  lines: readonly StoryLine[],
  words: number,
): ChatMessage[] {
  return prompt(chronicler, words, `The story so far:\n"""\n${story(lines)}\n"""`);
}

/** Fold what happened since into the last summary. */
export function differentialPrompt(
  chronicler: Actor,
  summary: string,
  lines: readonly StoryLine[],
  words: number,
): ChatMessage[] {
  return prompt(
    chronicler,
    words,
    `The summary so far:\n"""\n${summary}\n"""\n\nWhat happened since:\n"""\n${story(lines)}\n"""\n\nWrite the updated summary. Keep what still matters, drop what no longer does.`,
  );
}
