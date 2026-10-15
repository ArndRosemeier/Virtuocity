import type { DocType } from './doc-type';
import { defineDocType } from './doc-type';
import type { OutputPart } from './output';
import { outputPartSchema } from './output';
import type { SkillContext } from './skill-context';
import { z } from 'zod';

export interface KeptPartsState {
  /** What each actor kept last, by actor id. */
  readonly byActor: Readonly<Record<string, readonly OutputPart[]>>;
}

export interface KeptPartsOp {
  readonly actorId: string;
  readonly parts: readonly OutputPart[];
}

interface Shown {
  readonly parts: OutputPart[];
}

/**
 * The latest output parts each actor of a skill produced, e.g. gathered facts
 * or an analysis, kept in the log so they rewind, branch and save with the
 * session, plus what a space showing them needs.
 */
export interface KeptParts {
  readonly doc: DocType<KeptPartsState, KeptPartsOp>;
  /** What this actor kept last. */
  shown(ctx: Pick<SkillContext, 'state' | 'actor'>): Shown;
  /** Keeps these parts as this actor's latest, and returns what it shows now. */
  keep(ctx: Pick<SkillContext, 'state' | 'actor'>, parts: readonly OutputPart[]): Promise<Shown>;
  /**
   * A space's `fill`, `discard` and `redo` for the kept parts: discarding keeps
   * nothing, redoing runs `refresh` again.
   */
  space(refresh: (ctx: SkillContext) => Promise<void>): {
    fill(input: unknown, ctx: SkillContext): Promise<Shown>;
    discard(input: unknown, ctx: SkillContext): Promise<Shown>;
    redo(input: unknown, ctx: SkillContext): Promise<Shown>;
  };
}

/** A document of kept parts with the given id, and the ways to read and change it. */
export function keptParts(id: string, description: string): KeptParts {
  const doc = defineDocType<KeptPartsState, KeptPartsOp>({
    id,
    version: 1,
    description,
    op: z.object({ actorId: z.string(), parts: z.array(outputPartSchema) }),
    initial: () => ({ byActor: {} }),
    apply: (state, op) => ({ byActor: { ...state.byActor, [op.actorId]: op.parts } }),
  });
  const shown: KeptParts['shown'] = (ctx) => ({
    parts: [...(ctx.state.read(id, doc).byActor[ctx.actor.id] ?? [])],
  });
  const keep: KeptParts['keep'] = async (ctx, parts) => {
    await ctx.state.change(id, doc, { actorId: ctx.actor.id, parts });
    return shown(ctx);
  };
  return {
    doc,
    shown,
    keep,
    space: (refresh) => ({
      fill: (_input, ctx) => Promise.resolve(shown(ctx)),
      discard: (_input, ctx) => keep(ctx, []),
      redo: async (_input, ctx) => {
        await refresh(ctx);
        return shown(ctx);
      },
    }),
  };
}
