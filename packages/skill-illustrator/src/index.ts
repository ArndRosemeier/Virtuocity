import { illustratorContract } from '@virtuocity/contract-visual';
import type { Skill, SkillContext, VirtuocityModule } from '@virtuocity/core';
import { implement, readSettings, turnEnded } from '@virtuocity/core';
import { illustrate, paintNow } from './paint';
import { appearanceField, illustratorSettings, latestToPaint, sceneToPaint } from './prompt';

export * from './prompt';

/** Paints in the background, so the story never waits. */
function paint(ctx: SkillContext, description: string): void {
  ctx.startJob('Illustrating the scene', ({ signal }) => paintNow(ctx, description, signal));
}

/** Paints the newest message right away, when a person picks this illustrator. */
async function paintOnRequest(ctx: SkillContext): Promise<void> {
  const scene = latestToPaint(ctx.transcript, ctx.actor.id);
  if (!scene) throw new Error('Nothing to paint yet: write what you want to see first.');
  await paintNow(ctx, scene);
}

/**
 * Draws pictures with an image model and posts them into the session; a
 * gallery is where they are browsed. Picked by a person, it paints the newest
 * message right away. With `automatic` on, it also illustrates other actors'
 * turns in the background, so the session never waits.
 */
export const illustratorSkill: Skill = {
  id: 'illustrator',
  name: 'Illustrator',
  backing: 'llm',
  modalities: ['image'],
  settings: illustratorSettings,
  implements: [
    implement(illustratorContract, {
      illustrate: async (input, ctx) => (await illustrate(ctx, input)).picture,
    }),
  ],
  onRequest: paintOnRequest,
  listensTo: [turnEnded.type],
  onEvent: (event, ctx) => {
    const { automatic, every } = readSettings(illustratorSettings, ctx.settings);
    if (!automatic || !turnEnded.is(event) || event.payload.actorId === ctx.actor.id) {
      return Promise.resolve();
    }
    const scene = sceneToPaint(ctx.transcript, ctx.actor.id, event.payload.actorId, every);
    if (scene) paint(ctx, scene);
    return Promise.resolve();
  },
};

export const illustratorModule: VirtuocityModule = {
  id: 'skill-illustrator',
  register: (host) => {
    host.contracts.register(illustratorContract);
    host.skills.register(illustratorSkill);
    host.profileFields.register(appearanceField);
  },
};
