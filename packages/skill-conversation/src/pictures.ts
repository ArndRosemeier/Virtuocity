import type { Picture } from '@virtuocity/contract-visual';
import { pictureSourceContract } from '@virtuocity/contract-visual';
import type { ChatMessage, Content, GeneratedMedia, Message, SkillContext } from '@virtuocity/core';
import { IMAGE_PART, storeMedia } from '@virtuocity/core';

/** The session's current picture, with the message it is in. */
export type CurrentPicture = Picture & { readonly messageId: string };

/**
 * How each picture in the story reads to a model: numbered in story order,
 * with its description, e.g. "[Picture 2: a fox in the snow]", so the person
 * and the model can refer to it by number.
 */
export function pictureLabels(history: readonly Message[]): Map<string, string> {
  const pictures = history.filter((m) => m.kind === IMAGE_PART);
  return new Map(pictures.map((m, i) => [m.id, `[Picture ${i + 1}: ${m.text}]`]));
}

/** Shows the model the current picture itself, after the story, by its number. */
export function lookAt(picture: CurrentPicture, history: readonly Message[]): ChatMessage {
  const label = pictureLabels(history).get(picture.messageId) ?? `[${picture.alt}]`;
  return {
    role: 'user',
    content: [
      { type: 'text', text: `The current picture, ${label}:` },
      { type: 'image', assetId: picture.assetId, mime: picture.mime, alt: picture.alt },
    ],
  };
}

/** What the session's picture source (a gallery, at most one) says is current, if it has one. */
export async function currentPicture(ctx: SkillContext): Promise<CurrentPicture | undefined> {
  const source = ctx.actors.find((a) => ctx.serves(a.id, pictureSourceContract));
  if (!source) return undefined;
  const { picture } = await ctx.invoke(source.id, pictureSourceContract, 'current', {});
  return picture;
}

const MAX_ALT = 200;

/** Pictures a model drew while talking, stored and described by what it said (or who drew them). */
export function storePictures(
  ctx: SkillContext,
  media: readonly GeneratedMedia[],
  words: string,
): Promise<Content[]> {
  const said = words.replace(/\s+/g, ' ').trim();
  const alt =
    said.length === 0
      ? `A picture by ${ctx.actor.personality.name}`
      : said.length > MAX_ALT
        ? `${said.slice(0, MAX_ALT - 1)}…`
        : said;
  return storeMedia(ctx.assets, media, alt);
}
