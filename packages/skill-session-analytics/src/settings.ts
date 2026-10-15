import { defineSettings, z } from '@virtuocity/core';

export const sessionAnalyticsSettings = defineSettings({
  automatic: z
    .boolean()
    .default(false)
    .describe(
      "Update on its own after every new post and finished background job (e.g. a new summary). When off, it updates only when you click it under 'or ask:' or Retry in its space",
    ),
});
