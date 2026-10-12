import type { Picture } from '@virtuocity/contract-visual';
import { illustratorContract, sceneChannel } from '@virtuocity/contract-visual';
import type { CallStats, Skill, SkillContext, VirtuocityModule } from '@virtuocity/core';
import {
  IMAGE_PART,
  implement,
  readSettings,
  showOnChannel,
  storeMedia,
  turnEnded,
} from '@virtuocity/core';
import type { IllustrateRequest } from './prompt';
import { appearanceField, illustratePrompt, illustratorSettings, sceneToPaint } from './prompt';

export * from './prompt';

const ALT_LENGTH = 140;

function altText(description: string): string {
  const flat = description.replace(/\s+/g, ' ').trim();
  return flat.length > ALT_LENGTH ? `${flat.slice(0, ALT_LENGTH - 1)}…` : flat;
}

async function illustrate(
  ctx: SkillContext,
  request: IllustrateRequest,
  signal?: AbortSignal,
): Promise<{ picture: Picture; stats: CallStats }> {
  const settings = readSettings(illustratorSettings, ctx.settings);
  const result = await ctx.complete({
    modality: 'image',
    messages: illustratePrompt(ctx.actor, ctx.actors, request, settings),
    ...(signal ? { signal } : {}),
  });
  const [part] = await storeMedia(ctx.assets, result.media ?? [], altText(request.description));
  if (!part || part.kind !== IMAGE_PART) {
    throw new Error('The image model returned no picture. Pick an image model in Settings.');
  }
  return { picture: { ...part.data, alt: part.data.alt ?? 'A picture' }, stats: result.stats };
}

/**
 * Draws pictures with an image model. As an actor in a scene it illustrates
 * other actors' turns in the background, so the story never waits for it.
 */
export const illustratorSkill: Skill = {
  id: 'illustrator',
  name: 'Illustrator',
  backing: 'llm',
  settings: illustratorSettings,
  implements: [
    implement(illustratorContract, {
      illustrate: async (input, ctx) => (await illustrate(ctx, input)).picture,
    }),
  ],
  listensTo: [turnEnded.type],
  onEvent: (event, ctx) => {
    if (!turnEnded.is(event) || event.payload.actorId === ctx.actor.id) return Promise.resolve();
    const { every, inStory } = readSettings(illustratorSettings, ctx.settings);
    const scene = sceneToPaint(ctx.transcript, ctx.actor.id, event.payload.actorId, every);
    if (!scene) return Promise.resolve();
    ctx.startJob('Illustrating the scene', async ({ signal }) => {
      const { picture, stats } = await illustrate(ctx, { description: scene }, signal);
      const part = { kind: IMAGE_PART, data: picture };
      await showOnChannel(ctx.state, sceneChannel, part);
      if (inStory) await ctx.post([part], [stats]);
    });
    return Promise.resolve();
  },
};

export const illustratorModule: VirtuocityModule = {
  id: 'skill-illustrator',
  register: (host) => {
    host.contracts.register(illustratorContract);
    host.channels.register(sceneChannel);
    host.skills.register(illustratorSkill);
    host.profileFields.register(appearanceField);
  },
};
