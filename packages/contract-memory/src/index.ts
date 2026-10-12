import { action, check, defineContract, z } from '@virtuocity/core';

const line = z.object({
  id: z.string().describe('The message this line comes from'),
  speaker: z.string().describe('Who said or did it'),
  text: z.string(),
});

export type StoryLine = z.infer<typeof line>;

const previous = z.object({
  summary: z.string(),
  upTo: z.string().describe('Id of the last line the summary covers'),
});

/**
 * Condenses a story so actors can remember more of it than their model can
 * read. The story itself is never shortened: a summary is extra knowledge for
 * model calls, kept beside the transcript.
 *
 * Implementations differ in how they get there. One may re-read every line,
 * another may only fold the lines after `previous.upTo` into the last summary.
 */
export const summarizerContract = defineContract({
  name: 'summarizer',
  version: '1.0',
  description: 'Summarizes a story so far, so actors remember what they can no longer read.',
  actions: {
    summarize: action({
      description: 'Summarize the story told by these lines.',
      input: z.object({
        lines: z.array(line).min(1).describe('The story to cover, oldest first'),
        previous: previous.optional().describe('The last summary, which may be built on'),
        words: z.number().int().positive().optional().describe('About how long the summary is'),
      }),
      output: z.object({ summary: z.string().min(1) }),
    }),
  },
  conformance: [
    {
      name: 'summarizes a story',
      run: async (t) => {
        const lines = [
          { id: 'm1', speaker: 'Narrator', text: 'Rain hammers the inn as a stranger walks in.' },
          { id: 'm2', speaker: 'Wren', text: 'Wren hides the map under her cloak.' },
        ];
        const { summary } = await t.invoke('summarize', { lines });
        check(summary.trim() !== '', 'expected a summary');
      },
    },
    {
      name: 'builds on a previous summary',
      run: async (t) => {
        const lines = [
          { id: 'm1', speaker: 'Narrator', text: 'The stranger asks about the map.' },
          { id: 'm2', speaker: 'Wren', text: 'Wren lies and says she burned it.' },
        ];
        const previous = { summary: 'Wren has a map. A stranger came in.', upTo: 'm1' };
        const { summary } = await t.invoke('summarize', { lines, previous });
        check(summary.trim() !== '', 'expected a summary');
      },
    },
    {
      name: 'copes with a previous summary of lines that are gone',
      run: async (t) => {
        const lines = [{ id: 'm9', speaker: 'Narrator', text: 'Morning comes.' }];
        const previous = { summary: 'An old, rewound night.', upTo: 'gone' };
        const { summary } = await t.invoke('summarize', { lines, previous });
        check(summary.trim() !== '', 'expected a summary');
      },
    },
  ],
});
