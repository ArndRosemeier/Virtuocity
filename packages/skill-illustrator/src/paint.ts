import type { Picture } from '@virtuocity/contract-visual';
import type { CallStats, SkillContext } from '@virtuocity/core';
import { IMAGE_PART, readSettings, storeMedia } from '@virtuocity/core';
import type { IllustrateRequest } from './prompt';
import { illustratePrompt, illustratorSettings } from './prompt';

const ALT_LENGTH = 140;

function altText(description: string): string {
  const flat = description.replace(/\s+/g, ' ').trim();
  return flat.length > ALT_LENGTH ? `${flat.slice(0, ALT_LENGTH - 1)}…` : flat;
}

export async function illustrate(
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

/** Paints a picture and posts it into the session. */
export async function paintNow(
  ctx: SkillContext,
  description: string,
  signal?: AbortSignal,
): Promise<void> {
  const { picture, stats } = await illustrate(ctx, { description }, signal);
  const part = { kind: IMAGE_PART, data: { ...picture, description } };
  await ctx.post({ ...part, text: picture.alt }, [stats]);
}
