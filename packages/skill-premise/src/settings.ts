import { defineSettings, z } from '@virtuocity/core';

export const fixedPremiseSettings = defineSettings({
  premise: z
    .string()
    .max(20000)
    .default(
      'Rain drums on the roof of a roadside inn. Tonight every room is taken, the last coach has not arrived, and someone has left a sealed letter on your table.',
    )
    .describe('The premise every session starts with, word for word'),
});

export const promptedPremiseSettings = defineSettings({
  prompt: z
    .string()
    .max(5000)
    .default('An adventure that begins with a small mystery.')
    .describe('What the premise should be about, e.g. a theme, a setting or a twist'),
  words: z
    .number()
    .int()
    .min(20)
    .max(1000)
    .default(150)
    .describe('About how many words the premise has'),
});

export type PromptedPremiseSettings = z.output<typeof promptedPremiseSettings>;
