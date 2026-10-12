import { premiseContract } from '@virtuocity/contract-premise';
import type { Implementation, Skill, SkillContext, VirtuocityModule } from '@virtuocity/core';
import {
  actorJoined,
  implement,
  readSettings,
  sessionStarted,
  isStarting,
  textContent,
} from '@virtuocity/core';
import { deliverPremise } from './deliver';
import { fixedPremiseSettings } from './settings';

export * from './settings';

/**
 * A premise actor: silent, and active only while the story is empty, when the
 * session starts with it or when it joins later.
 */
function premiseSkill(skill: Omit<Skill, 'listensTo' | 'onEvent'>): Skill {
  return {
    ...skill,
    listensTo: [sessionStarted.type, actorJoined.type],
    onEvent: (event, ctx) => {
      const joined = actorJoined.is(event) && event.payload.actorId === ctx.actor.id;
      if (sessionStarted.is(event) || (joined && !isStarting(ctx.bus))) {
        deliverPremise(ctx, !readSettings(fixedPremiseSettings, ctx.settings).shown);
      }
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
