import { action, check, defineContract, outputPartSchema, z } from '@virtuocity/core';

/**
 * Gathers what the session has established so far: who and what is in it,
 * where things are, what happened and what is still open. The gatherer reads
 * the whole session itself, from its actor's point of view. What it returns
 * is not tied to any kind of content: a list in words, a table, a map.
 */
export const factGathererContract = defineContract({
  name: 'fact-gatherer',
  version: '1.0',
  description: 'Gathers the facts the session has established so far.',
  actions: {
    gather: action({
      description: 'Read the whole session and return the facts it has established.',
      input: z.object({}),
      output: z.object({
        parts: z.array(outputPartSchema).describe('The facts, as output parts of any kind'),
      }),
    }),
  },
  conformance: [
    {
      name: 'gathers facts as output parts',
      run: async (t) => {
        const { parts } = await t.invoke('gather', {});
        check(
          parts.every((p) => p.kind.trim() !== ''),
          'expected every part to say what kind it is',
        );
      },
    },
  ],
});
