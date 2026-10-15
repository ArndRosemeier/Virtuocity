import { action, check, defineContract, outputPartSchema, z } from '@virtuocity/core';

export * from './figures';
export * from './outline';

/**
 * Looks at the session as a whole rather than at what it says: how it is
 * built, who posted what kind of thing and where. What it returns is not tied
 * to any kind of content: a strip of posts (`session-outline`), figures such
 * as word counts (`session-figures`), a chart, a
 * table. Room for more analyses later; each is another implementation.
 */
export const sessionAnalyticsContract = defineContract({
  name: 'session-analytics',
  version: '1.0',
  description: 'Analyses the session as a whole, e.g. how its posts are laid out.',
  actions: {
    analyze: action({
      description: 'Look at the whole session and return the analysis.',
      input: z.object({}),
      output: z.object({
        parts: z.array(outputPartSchema).describe('The analysis, as output parts of any kind'),
      }),
    }),
  },
  conformance: [
    {
      name: 'analyses the session as output parts',
      run: async (t) => {
        const { parts } = await t.invoke('analyze', {});
        check(
          parts.every((p) => p.kind.trim() !== ''),
          'expected every part to say what kind it is',
        );
      },
    },
  ],
});
