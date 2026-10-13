import { defineSettings, z } from '@virtuocity/core';

export const DEFAULT_FACTS_PROMPT = [
  'You keep track of the facts a collaborative session has established, so nobody contradicts them later.',
  'Read the whole session and list every fact that matters, grouped under short headings: people and creatures (who they are, how they look, what they want), places, things and who has them, relationships, events in the order they happened, and open threads (questions, promises, secrets, debts).',
  'Only list what the session states or clearly shows; never invent or guess. When the session changed a fact, keep only the newest version.',
  'Write a terse markdown list with headings. No preamble and no commentary.',
].join('\n\n');

export const factGathererSettings = defineSettings({
  prompt: z
    .string()
    .max(20000)
    .default(DEFAULT_FACTS_PROMPT)
    .describe('What the model is told to gather and how to write it down'),
  automatic: z
    .boolean()
    .default(false)
    .describe(
      "Gather on its own after other actors' turns. When off, it gathers only when you click it under 'or ask:'",
    ),
});

export type FactGathererSettings = z.output<typeof factGathererSettings>;
