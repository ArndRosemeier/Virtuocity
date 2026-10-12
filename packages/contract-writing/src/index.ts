import { action, check, defineContract, z } from '@virtuocity/core';

/** Writes prose to a brief: a chapter, a scene, a description. */
export const writerContract = defineContract({
  name: 'writer',
  version: '1.0',
  description: 'Writes prose to a brief, and revises it from notes.',
  actions: {
    write: action({
      description:
        'Write the text the brief asks for. When a previous draft and notes are given, revise it.',
      input: z.object({
        brief: z.string().min(1).describe('What to write'),
        context: z.string().optional().describe('What came before, style, world facts'),
        previousDraft: z.string().optional().describe('The draft to revise'),
        notes: z.array(z.string()).optional().describe('Notes to address in the revision'),
      }),
      output: z.object({ text: z.string().min(1).describe('The prose') }),
    }),
  },
  conformance: [
    {
      name: 'writes non-empty prose for a brief',
      run: async (t) => {
        const { text } = await t.invoke('write', {
          brief: 'A short opening line for a ghost story.',
        });
        check(text.trim().length > 0, 'the text is empty');
      },
    },
    {
      name: 'returns a revision when given notes',
      run: async (t) => {
        const { text } = await t.invoke('write', {
          brief: 'A short opening line for a ghost story.',
          previousDraft: 'It was dark.',
          notes: ['Make it more specific.'],
        });
        check(text.trim().length > 0, 'the revision is empty');
      },
    },
  ],
});
