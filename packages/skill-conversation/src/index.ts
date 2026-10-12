import type { Skill, VirtuocityModule } from '@virtuocity/core';
import { completeWithTools, readSettings, toolUseParts } from '@virtuocity/core';
import { buildPrompt, conversationSettings } from './prompt';

export * from './prompt';

/**
 * Lets an actor speak. Actors without it are silent. The actor's other skills
 * are offered as tools, so a character with dice can roll while speaking.
 */
export const conversationSkill: Skill = {
  id: 'conversation',
  name: 'Conversation',
  backing: 'llm',
  settings: conversationSettings,
  async takeTurn(ctx) {
    const settings = readSettings(conversationSettings, ctx.settings);
    const messages = buildPrompt(ctx.actor, ctx.actors, ctx.transcript, settings);
    const request = { modality: 'text', messages };
    const { result, calls, runs } = await completeWithTools(ctx.complete, request, ctx.tools);
    const text = { kind: 'text', data: result.text.trim() };
    await ctx.post(
      [...toolUseParts(runs), text],
      calls.map((c) => c.stats),
    );
  },
};

export const conversationModule: VirtuocityModule = {
  id: 'skill-conversation',
  register: (host) => host.skills.register(conversationSkill),
};
