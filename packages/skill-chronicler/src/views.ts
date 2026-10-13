import { markerContract } from '@virtuocity/contract-render';
import { spaceContract } from '@virtuocity/contract-space';
import type { SkillContext } from '@virtuocity/core';
import { implement } from '@virtuocity/core';
import { MEMORY, chronicles, memoryDoc } from './memory';

/** "Summarized" after the last message this chronicler's summary covers. */
export const chronicleMarker = implement(markerContract, {
  markers: (_input, ctx) => {
    const chronicle = chronicles(ctx.state)[ctx.actor.id];
    return Promise.resolve({
      markers: chronicle ? [{ afterId: chronicle.upTo, label: 'Summarized' }] : [],
    });
  },
});

function summaryParts(ctx: Pick<SkillContext, 'state' | 'actor'>) {
  const chronicle = chronicles(ctx.state)[ctx.actor.id];
  return chronicle ? [{ kind: 'text', data: chronicle.summary }] : [];
}

/**
 * The summary itself, in the chronicler's space, shown once its marker is
 * clicked. Discarding it forgets the summary; the chronicler writes a new one
 * from the whole story when it next updates.
 */
export const chronicleSpace = implement(spaceContract, {
  fill: (_input, ctx) => Promise.resolve({ parts: summaryParts(ctx), onDemand: true }),
  discard: async (_input, ctx) => {
    await ctx.state.change(MEMORY, memoryDoc, { type: 'forget', chroniclerId: ctx.actor.id });
    return { parts: summaryParts(ctx) };
  },
});
