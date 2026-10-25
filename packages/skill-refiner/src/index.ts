import { refinerContract } from '@virtuocity/contract-refiner';
import type { Content, Skill, SkillContext, Starter, VirtuocityModule } from '@virtuocity/core';
import { implement, readSettings, sessionText, textContent } from '@virtuocity/core';
import { refinePrompt } from './prompt';
import { refinerSettings } from './settings';

export * from './prompt';
export * from './settings';

/** Sends the command with the draft's text appended to the text model, with the session if wanted. */
async function refine(draft: Content, ctx: SkillContext) {
  const { command, context } = readSettings(refinerSettings, ctx.settings);
  const session = context ? sessionText(ctx.transcript, ctx.everyone) : undefined;
  const { text } = await ctx.complete({
    modality: 'text',
    messages: refinePrompt(command, draft.text, session),
  });
  const refined = text.trim();
  if (!refined) throw new Error('The model returned no text.');
  return { draft: textContent(refined) };
}

/**
 * Refines what the person is writing before it is sent: a text model gets the
 * actor's editable command with the draft appended, and the answer replaces
 * the draft. It never acts on its own and never posts to the session.
 */
export const refinerSkill: Skill = {
  id: 'refiner',
  name: 'Refiner',
  backing: 'llm',
  modalities: ['text'],
  settings: refinerSettings,
  implements: [implement(refinerContract, { refine: ({ draft }, ctx) => refine(draft, ctx) })],
};

/** A refiner for the input box, offered on a fresh start. */
export const refinerStarter: Starter = {
  id: 'refiner',
  personality: {
    name: 'Refiner',
    description: 'Refines what you are typing in the input box before you send it.',
  },
  needs: [refinerContract],
};

export const refinerModule: VirtuocityModule = {
  id: 'skill-refiner',
  register: (host) => {
    host.contracts.register(refinerContract);
    host.skills.register(refinerSkill);
    host.starters.register(refinerStarter);
  },
};
