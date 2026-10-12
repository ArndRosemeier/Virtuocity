import { defineSettings, z } from '@virtuocity/core';

export const chroniclerSettings = defineSettings({
  keepRecent: z
    .number()
    .int()
    .min(500)
    .max(100000)
    .default(2000)
    .describe(
      'Tokens of the newest story left out of the summary. Keep it below the memory of the actors reading it',
    ),
  updateAfter: z
    .number()
    .int()
    .min(200)
    .max(20000)
    .default(1500)
    .describe('Update the summary once this many tokens of older story are not in it yet'),
  summaryWords: z
    .number()
    .int()
    .min(50)
    .max(2000)
    .default(300)
    .describe('About how many words the summary has'),
});

export type ChroniclerSettings = z.output<typeof chroniclerSettings>;
