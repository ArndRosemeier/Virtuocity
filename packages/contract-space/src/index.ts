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
 *
 * Every space can be thrown away (`discard`), since 1.1; a person can always
 * get rid of what a space shows. Since 1.2 a space may hold several items a
 * person steps through (`browse`), e.g. a gallery of pictures.
 */
export const spaceContract = defineContract({
  name: 'space',
  version: '1.2',
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
        items: z
          .array(outputPartSchema)
          .optional()
          .describe('Everything a person can step through; `parts` show the current one'),
        current: z.number().int().min(0).optional().describe('Which of `items` is shown'),
      }),
    }),
    browse: optionalAction({
      description:
        'A person stepped to another of the items, by its position. Returns what the space shows now.',
      input: z.object({ to: z.number().int().min(0) }),
      output: content,
    }),
    edit: optionalAction({
      description: 'A person changed what the space shows. Returns what it shows now.',
      input: content,
      output: content,
    }),
    discard: action({
      description:
        'A person threw away what the space shows, e.g. a picture or a list, wherever else it appears too. Returns what it shows now.',
      input: z.object({}),
      output: content,
    }),
    redo: optionalAction({
      description:
        'A person wants what the space shows made again, e.g. the picture painted anew, replacing it wherever it appears. Returns what it shows now.',
      input: z.object({}),
      output: content,
    }),
  },
  conformance: [
    {
      name: 'shows the item a person browsed to, if it can be browsed',
      run: async (t) => {
        if (!t.implements('browse')) return;
        await t.invoke('browse', { to: 0 });
        const { items = [], current } = await t.invoke('fill', {});
        check(items.length === 0 || current === 0, 'expected the first item to be current');
      },
    },
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
      name: 'still fills its space after discarding',
      run: async (t) => {
        const { parts } = await t.invoke('discard', {});
        check(Array.isArray(parts), 'expected what the space shows after discarding');
      },
    },
    {
      name: 'stops showing what was edited in once discarded, if it can be edited',
      run: async (t) => {
        if (!t.implements('edit')) return;
        const parts = [{ kind: 'text', data: 'A note to throw away.' }];
        await t.invoke('edit', { parts });
        const { parts: after } = await t.invoke('discard', {});
        check(JSON.stringify(after) !== JSON.stringify(parts), 'expected the edit to be gone');
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
