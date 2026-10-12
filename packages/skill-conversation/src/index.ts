import type { Skill, VirtuocityModule } from '@virtuocity/core';
import { buildPrompt } from './prompt';

export * from './prompt';

/** Lets an actor speak. Actors without it are silent. */
export const conversationSkill: Skill = {
  id: 'conversation',
  name: 'Conversation',
  backing: 'llm',
  async takeTurn(ctx) {
    const messages = buildPrompt(ctx.actor, ctx.actors, ctx.transcript);
    const result = await ctx.complete({ modality: 'text', messages });
    await ctx.post([{ kind: 'text', data: result.text.trim() }], [result.stats]);
  },
};

export const conversationModule: VirtuocityModule = {
  id: 'skill-conversation',
  register: (host) => host.skills.register(conversationSkill),
};
