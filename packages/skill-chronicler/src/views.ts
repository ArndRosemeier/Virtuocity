import { markerContract } from '@virtuocity/contract-render';
import { spaceContract } from '@virtuocity/contract-space';
import { implement } from '@virtuocity/core';
import { chronicles } from './memory';

/** "Summarized" after the last message this chronicler's summary covers. */
export const chronicleMarker = implement(markerContract, {
  markers: (_input, ctx) => {
    const chronicle = chronicles(ctx.state)[ctx.actor.id];
    return Promise.resolve({
      markers: chronicle ? [{ afterId: chronicle.upTo, label: 'Summarized' }] : [],
    });
  },
});

/** The summary itself, in the chronicler's space, shown once its marker is clicked. */
export const chronicleSpace = implement(spaceContract, {
  fill: (_input, ctx) => {
    const chronicle = chronicles(ctx.state)[ctx.actor.id];
    const parts = chronicle ? [{ kind: 'text', data: chronicle.summary }] : [];
    return Promise.resolve({ parts, onDemand: true });
  },
});
