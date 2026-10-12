import type { Picture } from '@virtuocity/contract-visual';
import { spaceContract } from '@virtuocity/contract-space';
import { illustratorContract, sceneChanged, sceneChannel } from '@virtuocity/contract-visual';
import type {
  CallStats,
  OutputPart,
  Skill,
  SkillContext,
  VirtuocityModule,
} from '@virtuocity/core';
import {
  IMAGE_PART,
  channelContents,
  implement,
  readSettings,
  showOnChannel,
  storeMedia,
  turnEnded,
} from '@virtuocity/core';
import type { IllustrateRequest } from './prompt';
import {
  appearanceField,
  illustratePrompt,
  illustratorSettings,
  latestToPaint,
  sceneToPaint,
} from './prompt';

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
    messages: illustratePrompt(ctx.cast, request, settings),
    ...(signal ? { signal } : {}),
  });
  const [part] = await storeMedia(ctx.assets, result.media ?? [], altText(request.description));
  if (!part || part.kind !== IMAGE_PART) {
    throw new Error('The image model returned no picture. Pick an image model in Settings.');
  }
  return { picture: { ...part.data, alt: part.data.alt ?? 'A picture' }, stats: result.stats };
}

/** The latest picture this illustrator painted: the scene it shows, or else its last one in the story. */
function latestPicture(ctx: SkillContext): { parts: OutputPart[] } {
  const scene = channelContents(ctx.state)[sceneChannel.id];
  if (scene?.actorId === ctx.actor.id) return { parts: [scene.part] };
  const last = ctx.transcript
    .filter((m) => m.actorId === ctx.actor.id && m.kind === IMAGE_PART)
    .at(-1);
  return { parts: last ? [{ kind: last.kind, data: last.data }] : [] };
}

/** Paints a picture that becomes the scene, and joins the story if asked. */
async function paintNow(
  ctx: SkillContext,
  description: string,
  inStory: boolean,
  signal?: AbortSignal,
): Promise<void> {
  const { picture, stats } = await illustrate(ctx, { description }, signal);
  const part = { kind: IMAGE_PART, data: picture };
  await showOnChannel(ctx.state, sceneChannel, part);
  if (inStory) await ctx.post({ ...part, text: picture.alt }, [stats]);
}

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
    implement(spaceContract, { fill: (_input, ctx) => Promise.resolve(latestPicture(ctx)) }),
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
