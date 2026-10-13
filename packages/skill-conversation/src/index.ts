import { speakerContract } from '@virtuocity/contract-speaker';
import type { CallStats, Content, Skill, SkillContext, VirtuocityModule } from '@virtuocity/core';
import {
  completeWithTools,
  implement,
  readSettings,
  textContent,
  toolUseContent,
} from '@virtuocity/core';
import { buildPrompt, contextBudget, conversationSettings } from './prompt';

export * from './prompt';

/** What the actor says next: the tools it used, then its words, and what the calls cost. */
async function reply(
  ctx: SkillContext,
): Promise<{ parts: Content[]; stats: readonly CallStats[] }> {
  const settings = readSettings(conversationSettings, ctx.settings);
  const { text: context } = ctx.context(contextBudget(settings));
  const messages = buildPrompt(ctx.actor, ctx.actors, ctx.transcript, {
    settings,
    context,
    cast: ctx.cast,
  });
  const request = { modality: 'text', messages };
  const { result, calls, runs } = await completeWithTools(ctx.complete, request, ctx.tools);
  const parts = [...runs.map(toolUseContent), textContent(result.text.trim())];
  return { parts, stats: calls.map((c) => c.stats) };
}

/**
 * Lets an actor speak with a text model (`speaker@1.0`). The actor's other
 * skills are offered as tools, so a character with dice can roll while
 * speaking. On its turn it posts what it says; the calls' cost goes with its
 * words.
 */
export const conversationSkill: Skill = {
  id: 'conversation',
  name: 'Conversation',
  backing: 'llm',
  modalities: ['text'],
  persona: true,
  character: true,
  settings: conversationSettings,
  implements: [implement(speakerContract, { speak: async (_input, ctx) => reply(ctx) })],
  async takeTurn(ctx) {
    const { parts, stats } = await reply(ctx);
    const words = parts.at(-1);
    for (const part of parts.slice(0, -1)) await ctx.post(part);
    if (words) await ctx.post(words, stats);
  },
};

export const conversationModule: VirtuocityModule = {
  id: 'skill-conversation',
  register: (host) => {
    host.contracts.register(speakerContract);
    host.skills.register(conversationSkill);
  },
};
