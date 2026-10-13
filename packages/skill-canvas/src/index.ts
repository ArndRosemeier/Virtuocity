import { spaceContract } from '@virtuocity/contract-space';
import type { OutputPart, Skill, SkillContext, VirtuocityModule } from '@virtuocity/core';
import { defineDocType, implement, outputPartSchema, z } from '@virtuocity/core';

export interface CanvasState {
  /** What each actor's canvas holds, by actor id. */
  readonly canvases: Readonly<Record<string, readonly OutputPart[]>>;
}

export interface CanvasOp {
  readonly actorId: string;
  readonly parts: readonly OutputPart[];
}

/** The canvases' contents. In the log, so they rewind, branch and save with the story. */
export const canvasDoc = defineDocType<CanvasState, CanvasOp>({
  id: 'canvas',
  version: 1,
  description: 'What each blank canvas holds.',
  op: z.object({ actorId: z.string(), parts: z.array(outputPartSchema) }),
  initial: () => ({ canvases: {} }),
  apply: (state, op) => ({ canvases: { ...state.canvases, [op.actorId]: op.parts } }),
});

export const CANVAS = 'canvas';

const shown = (ctx: SkillContext) => ({
  parts: [...(ctx.state.read(CANVAS, canvasDoc).canvases[ctx.actor.id] ?? [])],
});

async function keep(ctx: SkillContext, parts: readonly OutputPart[]) {
  await ctx.state.change(CANVAS, canvasDoc, { actorId: ctx.actor.id, parts });
  return shown(ctx);
}

/**
 * A blank space for the person: it shows whatever was put in it, nothing more.
 * Give it to any actor to get a canvas beside the story.
 */
export const canvasSkill: Skill = {
  id: 'canvas',
  name: 'Canvas',
  backing: 'code',
  implements: [
    implement(spaceContract, {
      fill: (_input, ctx) => Promise.resolve(shown(ctx)),
      edit: ({ parts }, ctx) => keep(ctx, parts),
      discard: (_input, ctx) => keep(ctx, []),
    }),
  ],
};

export const canvasModule: VirtuocityModule = {
  id: 'skill-canvas',
  register: (host) => {
    host.contracts.register(spaceContract);
    host.docTypes.register(canvasDoc);
    host.skills.register(canvasSkill);
  },
};
