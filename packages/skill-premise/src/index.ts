import { premiseContract } from '@virtuocity/contract-premise';
import type { Implementation, Skill, SkillContext, VirtuocityModule } from '@virtuocity/core';
import { firstStep, implement, readSettings, textContent } from '@virtuocity/core';
import { deliverPremise } from './deliver';
import { fixedPremiseSettings } from './settings';

export * from './settings';

/**
 * A premise actor: silent, and active only once, right before the session's
 * first step, so the premise is the one the actor has then.
 */
function premiseSkill(skill: Omit<Skill, 'listensTo' | 'onEvent'>): Skill {
  return {
    ...skill,
    listensTo: [firstStep.type],
    onEvent: (_event, ctx) =>
      deliverPremise(ctx, !readSettings(fixedPremiseSettings, ctx.settings).shown),
  };
}

const text = (premise: string) => ({ messages: [textContent(premise)] });

function fixedPremise(ctx: SkillContext) {
  const { premise } = readSettings(fixedPremiseSettings, ctx.settings);
  if (!premise.trim()) throw new Error("Write the premise in this actor's settings first.");
  return Promise.resolve(text(premise.trim()));
}

const implementing = (
  run: (ctx: SkillContext) => Promise<ReturnType<typeof text>>,
): Implementation[] => [implement(premiseContract, { premise: (_input, ctx) => run(ctx) })];

/** What a removed "Premise (from a prompt)" actor had asked for becomes its premise text. */
const fromPrompt = (old: unknown): unknown => {
  const prompt = (old as { prompt?: unknown } | null)?.prompt;
  return typeof prompt === 'string' ? { premise: prompt } : undefined;
};

/**
 * Opens every session with the same premise, written by you (Transform by AI
 * can turn a few words into one). It replaced "Premise (from a prompt)".
 */
export const fixedPremiseSkill = premiseSkill({
  id: 'fixed-premise',
  name: 'Premise',
  backing: 'code',
  settings: fixedPremiseSettings,
  replaces: [{ skillId: 'prompted-premise', settings: fromPrompt }],
  implements: implementing(fixedPremise),
});

export const premiseModule: VirtuocityModule = {
  id: 'skill-premise',
  register: (host) => {
    host.contracts.register(premiseContract);
    host.skills.register(fixedPremiseSkill);
  },
};
