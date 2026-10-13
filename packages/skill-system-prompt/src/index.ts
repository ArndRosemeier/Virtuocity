import type { Skill, VirtuocityModule } from '@virtuocity/core';
import { defineSettings, implement, instructionsContract, readSettings, z } from '@virtuocity/core';

export const systemPromptSettings = defineSettings({
  prompt: z
    .string()
    .max(20000)
    .default('')
    .describe('Instructions every actor that uses a text model follows, e.g. a style or a format'),
});

/**
 * A system prompt for the whole session (`instructions@1.0`). Actors with it
 * stay silent; what it says is added to every text-model call of every actor,
 * ahead of their own instructions. Several are combined in the order the
 * actors joined.
 */
export const systemPromptSkill: Skill = {
  id: 'system-prompt',
  name: 'System prompt',
  backing: 'code',
  settings: systemPromptSettings,
  implements: [
    implement(instructionsContract, {
      instructions: (_input, ctx) =>
        Promise.resolve({ text: readSettings(systemPromptSettings, ctx.settings).prompt }),
    }),
  ],
};

export const systemPromptModule: VirtuocityModule = {
  id: 'skill-system-prompt',
  register: (host) => host.skills.register(systemPromptSkill),
};
