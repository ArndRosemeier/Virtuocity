import type { DirectorCandidate } from '@virtuocity/contract-director';
import { directorContract } from '@virtuocity/contract-director';
import type { Skill, VirtuocityModule } from '@virtuocity/core';
import { implement } from '@virtuocity/core';
import { decideNext } from './decision';
import { leastRecent } from './turns';

export * from './decision';
export * from './turns';

const answer = (picked: DirectorCandidate | undefined) => {
  if (!picked) throw new Error('Nobody can take the next turn');
  return { next: picked.id };
};

/** Plain code: the AI who spoke least recently goes next. No model involved. */
export const directorSkill: Skill = {
  id: 'director',
  name: 'Director',
  backing: 'code',
  implements: [
    implement(directorContract, {
      next: ({ candidates }, ctx) =>
        Promise.resolve(answer(leastRecent(candidates, ctx.transcript))),
    }),
  ],
};

/**
 * Asks a decision model (Jev by default) who goes next, given the session and
 * the actor's personality, which says how it directs.
 */
export const decisionDirectorSkill: Skill = {
  id: 'decision-director',
  name: 'Director (decision model)',
  backing: 'llm',
  modalities: ['decisions'],
  persona: true,
  implements: [
    implement(directorContract, {
      next: async ({ candidates }, ctx) => answer(await decideNext(candidates, ctx)),
    }),
  ],
};

export const directorModule: VirtuocityModule = {
  id: 'skill-director',
  register: (host) => {
    host.contracts.register(directorContract);
    // The plain one first: the default Director actor gets the first skill that can direct.
    host.skills.register(directorSkill);
    host.skills.register(decisionDirectorSkill);
  },
};
