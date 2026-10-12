import { sceneChannel } from '@virtuocity/contract-visual';
import type { Message, OutputPart, SkillContext } from '@virtuocity/core';
import {
  IMAGE_PART,
  MAIN_TRANSCRIPT,
  channelContents,
  clearChannel,
  showOnChannel,
  transcriptDoc,
  z,
} from '@virtuocity/core';
import { illustrate } from './paint';

/**
 * The latest picture this illustrator painted: the scene it shows, or else its
 * last one in the story, leaving out a picture just thrown away (the context's
 * transcript is read once, before that).
 */
export function latestPicture(ctx: SkillContext, discarded?: string): { parts: OutputPart[] } {
  const scene = channelContents(ctx.state)[sceneChannel.id];
  if (scene?.actorId === ctx.actor.id) return { parts: [scene.part] };
  const last = ctx.transcript
    .filter((m) => m.actorId === ctx.actor.id && m.kind === IMAGE_PART)
    .filter((m) => discarded === undefined || assetOf(m) !== discarded)
    .at(-1);
  return { parts: last ? [{ kind: last.kind, data: last.data }] : [] };
}

/** What a painted picture holds; `description` is what it was painted from, when known. */
const painted = z.object({
  assetId: z.string(),
  alt: z.string(),
  description: z.string().optional(),
});

/** The asset a part shows, or `undefined` when it is not a painted picture. */
const assetOf = (part: Pick<OutputPart, 'data'>) => painted.safeParse(part.data).data?.assetId;

/** Where else a picture appears: this illustrator's story messages and its scene. */
function copiesOf(ctx: SkillContext, assetId: string) {
  const scene = channelContents(ctx.state)[sceneChannel.id];
  const inScene = scene?.actorId === ctx.actor.id && assetOf(scene.part) === assetId;
  const messages = ctx.transcript.filter(
    (m: Message) => m.actorId === ctx.actor.id && assetOf(m) === assetId,
  );
  return { inScene, messages };
}

/** Throws away the picture the space shows: from the scene and from the story. */
export async function discardPicture(ctx: SkillContext): Promise<{ parts: OutputPart[] }> {
  const [shown] = latestPicture(ctx).parts;
  const assetId = shown && assetOf(shown);
  if (!assetId) return latestPicture(ctx);
  const { inScene, messages } = copiesOf(ctx, assetId);
  if (inScene) {
    await clearChannel(ctx.state, sceneChannel);
  }
  for (const m of messages) {
    await ctx.state.change(MAIN_TRANSCRIPT, transcriptDoc, { type: 'remove', messageId: m.id });
  }
  return latestPicture(ctx, assetId);
}

/** Paints the picture the space shows again, from the same description, replacing it everywhere. */
export async function redoPicture(ctx: SkillContext): Promise<{ parts: OutputPart[] }> {
  const [shown] = latestPicture(ctx).parts;
  const old = shown && painted.safeParse(shown.data).data;
  if (!old) return latestPicture(ctx);
  const description = old.description ?? old.alt;
  const { picture } = await illustrate(ctx, { description });
  const part = { kind: IMAGE_PART, data: { ...picture, description } };
  const { inScene, messages } = copiesOf(ctx, old.assetId);
  if (inScene) await showOnChannel(ctx.state, sceneChannel, part);
  for (const m of messages) {
    const content = { ...part, text: picture.alt };
    await ctx.state.change(MAIN_TRANSCRIPT, transcriptDoc, {
      type: 'edit',
      messageId: m.id,
      content,
    });
  }
  return { parts: [part] };
}
