import { spaceContract } from '@virtuocity/contract-space';
import { illustratorContract, sceneChanged, sceneChannel } from '@virtuocity/contract-visual';
import type { Skill, SkillContext, VirtuocityModule } from '@virtuocity/core';
import { implement, readSettings, turnEnded } from '@virtuocity/core';
import { illustrate, paintNow } from './paint';
import { appearanceField, illustratorSettings, latestToPaint, sceneToPaint } from './prompt';
import { discardPicture, latestPicture, redoPicture } from './space';

export * from './prompt';

/** Paints in the background, so the story never waits. */
function paint(ctx: SkillContext, description: string, inStory: boolean): void {
  ctx.startJob('Illustrating the scene', ({ signal }) =>
    paintNow(ctx, description, inStory, signal),
  );
}

/** Paints the newest message right away, when a person picks this illustrator. */
async function paintOnRequest(ctx: SkillContext): Promise<void> {
  const scene = latestToPaint(ctx.transcript, ctx.actor.id);
  if (!scene) throw new Error('Nothing to paint yet: write what you want to see first.');
  await paintNow(ctx, scene, readSettings(illustratorSettings, ctx.settings).inStory);
}

/**
 * Draws pictures with an image model, and shows the latest in its space. As
 * an actor in a scene it illustrates other actors' turns, and every new scene
 * announced with `sceneChanged`, in the background, so the story never waits.
 * Picked by a person, it paints the newest message right away; with
 * `automatic` off, that is the only time it paints.
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
    implement(spaceContract, {
      fill: (_input, ctx) => Promise.resolve(latestPicture(ctx)),
      discard: (_input, ctx) => discardPicture(ctx),
      redo: (_input, ctx) => redoPicture(ctx),
    }),
  ],
  onRequest: paintOnRequest,
  listensTo: [turnEnded.type, sceneChanged.type],
  onEvent: (event, ctx) => {
    const { automatic, every, inStory } = readSettings(illustratorSettings, ctx.settings);
    if (!automatic) return Promise.resolve();
    if (sceneChanged.is(event)) {
      paint(ctx, event.payload.description, false);
    } else if (turnEnded.is(event) && event.payload.actorId !== ctx.actor.id) {
      const scene = sceneToPaint(ctx.transcript, ctx.actor.id, event.payload.actorId, every);
      if (scene) paint(ctx, scene, inStory);
    }
    return Promise.resolve();
  },
};

export const illustratorModule: VirtuocityModule = {
  id: 'skill-illustrator',
  register: (host) => {
    host.contracts.register(illustratorContract);
    host.contracts.register(spaceContract);
    host.channels.register(sceneChannel);
    host.skills.register(illustratorSkill);
    host.profileFields.register(appearanceField);
  },
};
