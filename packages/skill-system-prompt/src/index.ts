import type { InstructionSource, Skill, VirtuocityModule } from '@virtuocity/core';
import { defineSettings, readSettings, z } from '@virtuocity/core';

export const systemPromptSettings = defineSettings({
  prompt: z
    .string()
    .max(20000)
    .default('')
    .describe('Instructions every actor that uses a text model follows, e.g. a style or a format'),
});

/**
 * A system prompt for the whole session. Actors with it stay silent; what it
 * says is added to every text-model call of every actor, ahead of their own
 * instructions. Several are combined in the order the actors joined.
 */
export const systemPromptSkill: Skill = {
  id: 'system-prompt',
  name: 'System prompt',
  backing: 'code',
  settings: systemPromptSettings,
};

/** The prompts of every actor holding the skill, in cast order. */
export const systemPromptSource: InstructionSource = {
  id: 'system-prompt',
  instructions: ({ actors }) =>
    actors
      .filter((a) => a.skillIds.includes(systemPromptSkill.id))
      .map((a) => readSettings(systemPromptSettings, a.settings?.[systemPromptSkill.id]).prompt),
};

export const systemPromptModule: VirtuocityModule = {
  id: 'skill-system-prompt',
  register: (host) => {
    host.skills.register(systemPromptSkill);
    host.instructions.register(systemPromptSource);
  },
};
