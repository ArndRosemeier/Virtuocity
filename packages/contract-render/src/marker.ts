import { action, check, defineContract, z } from '@virtuocity/core';

const marker = z.object({
  afterId: z.string().describe('The message the marker follows'),
  label: z.string().min(1).describe('A word or two, e.g. "Summarized"'),
});

/** A marker as renderers receive it: where it goes, what it says, and whose it is. */
export const storyMarkerSchema = marker.extend({
  actorId: z.string().describe('The actor that placed it; clicking it opens that actor’s space'),
});

export type StoryMarker = z.output<typeof storyMarkerSchema>;

/**
 * Lets an actor place small labeled lines in the story view, e.g. a
 * chronicler's "Summarized" after the last message its summary covers. They
 * are not messages: no prompt reads them, and nothing in the session changes.
 * Clicking one opens the placing actor's space, if it has one.
 */
export const markerContract = defineContract({
  name: 'marker',
  version: '1.0',
  description: 'Places small labeled lines between the messages of the story view.',
  actions: {
    markers: action({
      description: 'Where the markers go now. Must be quick: it runs whenever the session changes.',
      input: z.object({}),
      output: z.object({ markers: z.array(marker) }),
    }),
  },
  conformance: [
    {
      name: 'places labeled markers',
      run: async (t) => {
        const { markers } = await t.invoke('markers', {});
        check(Array.isArray(markers), 'expected a list of markers');
        check(
          markers.every((m) => m.label.trim() !== ''),
          'expected every marker to have a label',
        );
      },
    },
  ],
});
