import type { DirectorCandidate } from '@virtuocity/contract-director';
import { directorContract } from '@virtuocity/contract-director';
import type { Skill, SkillContext, VirtuocityModule } from '@virtuocity/core';
import { completeStructured, implement, sameName, z } from '@virtuocity/core';
import { directorPrompt } from './prompt';

export * from './prompt';

/** Asks the text model for the name of who goes next and returns that candidate's id. */
async function pickNext(
  candidates: readonly DirectorCandidate[],
  ctx: SkillContext,
): Promise<{ next: string }> {
  const [first, ...rest] = candidates;
  if (!first) throw new Error('Nobody can take the next turn');
  if (rest.length === 0) return { next: first.id };
  const schema = z.object({ next: z.enum([first.name, ...rest.map((c) => c.name)]) });
  const { text: context } = ctx.context(Infinity);
  const view = { transcript: ctx.transcript, actors: ctx.actors, context };
  const messages = directorPrompt(ctx.actor, candidates, view);
  const { value } = await completeStructured(ctx.complete, { modality: 'text', messages }, schema);
  const picked = candidates.find((c) => sameName(c.name, value.next)) ?? first;
  return { next: picked.id };
}

/**
 * Directs a session with the default text model: after every turn it reads the
 * session and names who goes next, handing the turn back when a person should.
 * The actor's personality says how it directs.
 */
export const directorSkill: Skill = {
  id: 'director',
  name: 'Director',
  backing: 'llm',
  modalities: ['text'],
  persona: true,
  implements: [
    implement(directorContract, {
      next: ({ candidates }, ctx) => pickNext(candidates, ctx),
    }),
  ],
};

export const directorModule: VirtuocityModule = {
  id: 'skill-director',
  register: (host) => {
    host.contracts.register(directorContract);
    host.skills.register(directorSkill);
  },
};
