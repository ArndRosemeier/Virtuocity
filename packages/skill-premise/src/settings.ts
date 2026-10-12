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
