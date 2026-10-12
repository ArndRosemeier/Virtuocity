import type { Skill, VirtuocityModule } from '@virtuocity/core';
import { completeWithTools, toolUseParts } from '@virtuocity/core';
import { buildPrompt } from './prompt';

export * from './prompt';

/**
 * Lets an actor speak. Actors without it are silent. The actor's other skills
 * are offered as tools, so a character with dice can roll while speaking.
 */
export const conversationSkill: Skill = {
  id: 'conversation',
  name: 'Conversation',
  backing: 'llm',
  async takeTurn(ctx) {
    const messages = buildPrompt(ctx.actor, ctx.actors, ctx.transcript);
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
