import {
  action,
  check,
  defineContract,
  optionalAction,
  outputPartSchema,
  z,
} from '@virtuocity/core';

const content = z.object({
  parts: z.array(outputPartSchema).describe('What the space shows, as output parts of any kind'),
});

/**
 * Gives an actor its own space on screen, beside the story: an illustrator's
 * latest picture, a cartographer's map, a fact gatherer's notes, or a blank
 * canvas for the person. Not tied to any kind of content; the app renders the
 * parts with its renderers. Actors without it get no space.
 */
export const spaceContract = defineContract({
  name: 'space',
  version: '1.0',
  description: 'Shows something in the actor’s own space on screen.',
  actions: {
    fill: action({
      description:
        'What the space shows now. Must be quick: do slow work in the background and keep its results in state.',
      input: z.object({}),
      output: content.extend({
        onDemand: z
          .boolean()
          .optional()
          .describe('Show the space only once opened, e.g. from a marker, with a way to close it'),
      }),
    }),
    edit: optionalAction({
      description: 'A person changed what the space shows. Returns what it shows now.',
      input: content,
      output: content,
    }),
  },
  conformance: [
    {
      name: 'fills its space with output parts',
      run: async (t) => {
        const { parts } = await t.invoke('fill', {});
        check(
          parts.every((p) => p.kind.trim() !== ''),
          'expected every part to say what kind it is',
        );
      },
    },
    {
      name: 'shows what a person edited in, if it can be edited',
      run: async (t) => {
        if (!t.implements('edit')) return;
        const parts = [{ kind: 'text', data: 'The bridge is out.' }];
        await t.invoke('edit', { parts });
        const shown = await t.invoke('fill', {});
        check(JSON.stringify(shown.parts) === JSON.stringify(parts), 'expected the edit to show');
      },
    },
  ],
});
