import { action, check, defineContract, z } from '@virtuocity/core';

const note = z.object({
  comment: z.string().min(1).describe('What to change and why'),
  quote: z.string().optional().describe('The passage the comment is about, quoted exactly'),
});

export type CritiqueNote = z.infer<typeof note>;

const draft = z.object({
  text: z.string().min(1).describe('The text to look at'),
  focus: z.string().optional().describe('What to pay attention to, e.g. pacing or dialogue'),
});

/** Gives notes on a piece of text. Anyone who can comment on writing can fill this. */
export const criticContract = defineContract({
  name: 'critic',
  version: '1.0',
  description: 'Gives notes on a piece of text.',
  actions: {
    critique: action({
      description: 'Read the text and give concrete notes for improving it.',
      input: draft,
      output: z.object({ notes: z.array(note) }),
    }),
  },
  conformance: [
    {
      name: 'quotes only passages that are in the text',
      run: async (t) => {
        const text = 'The rain fell. Mira waited by the door, counting the drops.';
        const { notes } = await t.invoke('critique', { text });
        const bad = notes.filter((n) => n.quote !== undefined && !text.includes(n.quote));
        check(
          bad.length === 0,
          `quotes not found in the text: ${bad.map((n) => n.quote).join(' | ')}`,
        );
      },
    },
  ],
});

/** A critic that also decides whether a text is ready, e.g. a chapter in a book pipeline. */
export const reviewerContract = defineContract({
  name: 'reviewer',
  version: '1.0',
  description: 'Gives notes on a text and decides whether it is ready.',
  extends: [criticContract],
  actions: {
    review: action({
      description: 'Decide whether the text is ready, with a short summary and notes.',
      input: draft,
      output: z.object({
        approved: z.boolean(),
        summary: z.string().min(1),
        notes: z.array(note),
      }),
    }),
  },
  conformance: [
    {
      name: 'gives a summary with every verdict',
      run: async (t) => {
        const result = await t.invoke('review', { text: 'It was a dark and stormy night.' });
        check(result.summary.trim() !== '', 'summary is empty');
      },
    },
  ],
});
