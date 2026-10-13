import { factGathererContract } from '@virtuocity/contract-facts';
import { spaceContract } from '@virtuocity/contract-space';
import type { OutputPart, Skill, SkillContext, VirtuocityModule } from '@virtuocity/core';
import { implement, readSettings, turnEnded } from '@virtuocity/core';
import { FACTS, factsDoc, gatheredFacts } from './facts';
import { gatherPrompt, sessionText } from './prompt';
import { factGathererSettings } from './settings';

export * from './facts';
export * from './prompt';
export * from './settings';

/** Asks the text model for the facts of the whole session, as its actor sees it. */
async function gather(ctx: SkillContext) {
  const { prompt } = readSettings(factGathererSettings, ctx.settings);
  const session = sessionText(ctx.transcript, ctx.actors);
  const messages = gatherPrompt(prompt, session, gatheredFacts(ctx.state, ctx.actor.id));
  const { text } = await ctx.complete({ modality: 'text', messages });
  const facts = text.trim();
  if (!facts) throw new Error('The model returned no facts.');
  return { parts: [{ kind: 'text', data: facts }] };
}

const shown = (ctx: SkillContext) => ({ parts: gatheredFacts(ctx.state, ctx.actor.id) });

/** Keeps these facts as the gathered ones, and returns what the space shows now. */
async function keep(ctx: SkillContext, parts: readonly OutputPart[]) {
  await ctx.state.change(FACTS, factsDoc, { actorId: ctx.actor.id, parts });
  return shown(ctx);
}

/**
 * Gathers the facts through whatever skill of this actor implements the
 * fact-gatherer contract, so any gatherer can stand in, and keeps them for its space.
 */
async function refresh(ctx: SkillContext): Promise<void> {
  const { parts } = await ctx.invoke(ctx.actor.id, factGathererContract, 'gather', {});
  await keep(ctx, parts);
}

/** Gatherers with a refresh running, so a busy session doesn't start a second one. */
const busy = new Set<string>();

function refreshInBackground(ctx: SkillContext): void {
  if (busy.has(ctx.actor.id)) return;
  busy.add(ctx.actor.id);
  ctx.startJob('Gathering facts', async () => {
    try {
      await refresh(ctx);
    } finally {
      busy.delete(ctx.actor.id);
    }
  });
}

/**
 * Keeps a list of the facts the session has established in its own space,
 * written by a text model from the whole session and the actor's editable
 * prompt. Picked by a person (or Retry in its space), it gathers right away; with `automatic` on, it
 * also gathers in the background after other actors' turns. People can
 * correct the list in the space, and the next gathering keeps their corrections.
 */
export const factGathererSkill: Skill = {
  id: 'fact-gatherer',
  name: 'Fact gatherer',
  backing: 'llm',
  modalities: ['text'],
  settings: factGathererSettings,
  implements: [
    implement(factGathererContract, { gather: (_input, ctx) => gather(ctx) }),
    implement(spaceContract, {
      fill: (_input, ctx) => Promise.resolve(shown(ctx)),
      edit: ({ parts }, ctx) => keep(ctx, parts),
      discard: (_input, ctx) => keep(ctx, []),
      redo: async (_input, ctx) => {
        await refresh(ctx);
        return shown(ctx);
      },
    }),
  ],
  onRequest: refresh,
  listensTo: [turnEnded.type],
  onEvent: (event, ctx) => {
    const { automatic } = readSettings(factGathererSettings, ctx.settings);
    if (automatic && turnEnded.is(event) && event.payload.actorId !== ctx.actor.id) {
      refreshInBackground(ctx);
    }
    return Promise.resolve();
  },
};

export const factGathererModule: VirtuocityModule = {
  id: 'skill-fact-gatherer',
  register: (host) => {
    host.contracts.register(factGathererContract);
    host.contracts.register(spaceContract);
    host.docTypes.register(factsDoc);
    host.skills.register(factGathererSkill);
  },
};
