import { criticContract, reviewerContract } from '@virtuocity/contract-critique';
import type { Skill, SkillContext, VirtuocityModule } from '@virtuocity/core';
import { implement } from '@virtuocity/core';
import type { z } from '@virtuocity/core';
import { extractJson, reviewPrompt } from './prompt';

export * from './prompt';

const { actions } = reviewerContract;

type Draft = { readonly text: string; readonly focus?: string | undefined };

const CRITIQUE = 'Give concrete, actionable notes for improving the text.';
const REVIEW =
  'Decide whether the text is ready. Give a one or two sentence summary and concrete notes.';

/** Runs one structured model call and parses the reply against the action's output schema. */
async function ask<S extends z.ZodType>(
  ctx: SkillContext,
  task: string,
  input: Draft,
  schema: S,
): Promise<z.output<S>> {
  const result = await ctx.complete({
    modality: 'text',
    messages: reviewPrompt(ctx.actor, task, input, schema),
  });
  return schema.parse(extractJson(result.text));
}

/** LLM-backed reviewer for writing. Fills both `critic@1` and `reviewer@1` slots. */
export const reviewerSkill: Skill = {
  id: 'reviewer',
  name: 'Reviewer',
  backing: 'llm',
  implements: [
    implement(reviewerContract, {
      critique: (input, ctx) => ask(ctx, CRITIQUE, input, actions.critique.output),
      review: (input, ctx) => ask(ctx, REVIEW, input, actions.review.output),
    }),
  ],
};

export const reviewerModule: VirtuocityModule = {
  id: 'skill-reviewer',
  register: (host) => {
    host.contracts.register(criticContract);
    host.contracts.register(reviewerContract);
    host.skills.register(reviewerSkill);
  },
};
