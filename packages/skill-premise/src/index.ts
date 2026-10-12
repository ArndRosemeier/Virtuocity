import { premiseContract } from '@virtuocity/contract-premise';
import type { Implementation, Skill, SkillContext, VirtuocityModule } from '@virtuocity/core';
import { implement, readSettings, sessionStarted, textContent } from '@virtuocity/core';
import { deliverPremise } from './deliver';
import { premisePrompt } from './prompt';
import { fixedPremiseSettings, promptedPremiseSettings } from './settings';

export * from './prompt';
export * from './settings';

/** A premise actor: silent, and active only when a session starts. */
function premiseSkill(skill: Omit<Skill, 'listensTo' | 'onEvent'>): Skill {
  return {
    ...skill,
    listensTo: [sessionStarted.type],
    onEvent: (_event, ctx) => {
      deliverPremise(ctx);
      return Promise.resolve();
    },
  };
}

const text = (premise: string) => ({ messages: [textContent(premise)] });

function fixedPremise(ctx: SkillContext) {
  const { premise } = readSettings(fixedPremiseSettings, ctx.settings);
  if (!premise.trim()) throw new Error("Write the premise in this actor's settings first.");
  return Promise.resolve(text(premise.trim()));
}

async function promptedPremise(ctx: SkillContext) {
  const settings = readSettings(promptedPremiseSettings, ctx.settings);
  const messages = premisePrompt(ctx.actor, ctx.cast, settings);
  const { text: premise } = await ctx.complete({ modality: 'text', messages });
  if (!premise.trim()) throw new Error('The model returned an empty premise.');
  return text(premise.trim());
}

const implementing = (
  run: (ctx: SkillContext) => Promise<ReturnType<typeof text>>,
): Implementation[] => [implement(premiseContract, { premise: (_input, ctx) => run(ctx) })];

/** Opens every session with the same premise, written by you. */
export const fixedPremiseSkill = premiseSkill({
  id: 'fixed-premise',
  name: 'Premise (fixed text)',
  backing: 'code',
  settings: fixedPremiseSettings,
  implements: implementing(fixedPremise),
});

/** Opens every session with a fresh premise, written by a model from your prompt. */
export const promptedPremiseSkill = premiseSkill({
  id: 'prompted-premise',
  name: 'Premise (from a prompt)',
  backing: 'llm',
  modalities: ['text'],
  settings: promptedPremiseSettings,
  implements: implementing(promptedPremise),
});

export const premiseModule: VirtuocityModule = {
  id: 'skill-premise',
  register: (host) => {
    host.contracts.register(premiseContract);
    host.skills.register(promptedPremiseSkill);
    host.skills.register(fixedPremiseSkill);
  },
};
