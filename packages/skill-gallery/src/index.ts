import { spaceContract } from '@virtuocity/contract-space';
import { pictureSourceContract } from '@virtuocity/contract-visual';
import type {
  MediaPartData,
  OutputPart,
  Skill,
  SkillContext,
  Starter,
  VirtuocityModule,
} from '@virtuocity/core';
import { MAIN_TRANSCRIPT, implement, transcriptDoc } from '@virtuocity/core';
import { GALLERY, galleryDoc, galleryOf } from './gallery';

export * from './gallery';

const asPart = (m: { kind: string; data: unknown }): OutputPart => ({ kind: m.kind, data: m.data });

/** The gallery's space: the current picture, and every picture to step through. */
function fill(ctx: SkillContext) {
  const { shown, current } = galleryOf(ctx.state, ctx.actor.id);
  const picture = shown[current];
  return {
    parts: picture ? [asPart(picture)] : [],
    items: shown.map(asPart),
    ...(picture ? { current } : {}),
  };
}

/** Makes the picture at `to` current. */
async function browse(ctx: SkillContext, to: number) {
  const { shown } = galleryOf(ctx.state, ctx.actor.id);
  const [picture, newest] = [shown[to], shown.at(-1)];
  if (picture && newest) {
    await ctx.state.change(GALLERY, galleryDoc, { messageId: picture.id, newest: newest.id });
  }
  return fill(ctx);
}

/** Takes the current picture out of the story; the newest one left becomes current. */
async function discard(ctx: SkillContext) {
  const { shown, current } = galleryOf(ctx.state, ctx.actor.id);
  const picture = shown[current];
  if (picture) {
    await ctx.state.change(MAIN_TRANSCRIPT, transcriptDoc, {
      type: 'remove',
      messageId: picture.id,
    });
  }
  return fill(ctx);
}

/** The current picture as the picture source names it. */
function current(ctx: SkillContext) {
  const { shown, current: index } = galleryOf(ctx.state, ctx.actor.id);
  const picture = shown[index];
  if (!picture) return {};
  const data = picture.data as MediaPartData;
  return {
    picture: {
      messageId: picture.id,
      assetId: data.assetId,
      mime: data.mime,
      alt: data.alt ?? picture.text,
    },
  };
}

/**
 * Every picture of the session in one space, the newest first in view, with
 * a way to step back and forth. The picture it shows is the session's
 * current picture (`picture-source@1.0`): the one a talking model looks at
 * and refines.
 */
export const gallerySkill: Skill = {
  id: 'gallery',
  name: 'Gallery',
  backing: 'code',
  implements: [
    implement(spaceContract, {
      fill: (_input, ctx) => Promise.resolve(fill(ctx)),
      browse: ({ to }, ctx) => browse(ctx, to),
      discard: (_input, ctx) => discard(ctx),
    }),
    implement(pictureSourceContract, {
      current: (_input, ctx) => Promise.resolve(current(ctx)),
    }),
  ],
};

/** A gallery for any session with pictures, offered on a fresh start. */
export const galleryStarter: Starter = {
  id: 'gallery',
  personality: {
    name: 'Gallery',
    description:
      'Shows every picture of the session; the one in view is the one everyone works on.',
  },
  needs: [pictureSourceContract],
};

export const galleryModule: VirtuocityModule = {
  id: 'skill-gallery',
  register: (host) => {
    host.contracts.register(spaceContract);
    host.contracts.register(pictureSourceContract);
    host.docTypes.register(galleryDoc);
    host.skills.register(gallerySkill);
    host.starters.register(galleryStarter);
  },
};
