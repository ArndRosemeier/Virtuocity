import { defineSettings, z } from '@virtuocity/core';

export const DEFAULT_REFINE_COMMAND = 'Please refine this text: ';

export const refinerSettings = defineSettings({
  command: z
    .string()
    .max(20000)
    .default(DEFAULT_REFINE_COMMAND)
    .describe('What the model is told; the text from the input box is appended to it'),
  context: z
    .boolean()
    .default(true)
    .describe('Also send the session so far, so the model refines with it in mind'),
});

export type RefinerSettings = z.output<typeof refinerSettings>;
