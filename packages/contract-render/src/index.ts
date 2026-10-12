import {
  action,
  check,
  defineContract,
  messageSchema,
  outputPartSchema,
  z,
} from '@virtuocity/core';

/**
 * Draws the story. A story is a collection of messages of any kind; its
 * renderer decides how they look: as a chat, a page of prose, a storyboard.
 * It answers with output parts, which the app draws with its renderers, so
 * the view itself stays content-neutral. Every story has exactly one.
 */
export const renderContract = defineContract({
  name: 'render',
  version: '1.0',
  description: 'Draws the story from its messages.',
  actions: {
    render: action({
      description: 'How the story looks now. Must be quick: it runs whenever the story changes.',
      input: z.object({
        messages: z.array(messageSchema).describe('The story, as the person sees it'),
      }),
      output: z.object({
        parts: z.array(outputPartSchema).describe('The view, as output parts of any kind'),
      }),
    }),
  },
  conformance: [
    {
      name: 'draws an empty story',
      run: async (t) => {
        const { parts } = await t.invoke('render', { messages: [] });
        check(Array.isArray(parts), 'expected parts');
      },
    },
    {
      name: 'draws a story as output parts',
      run: async (t) => {
        const messages = [
          { id: 'm1', actorId: 'a', kind: 'text', data: 'Rain.', text: 'Rain.', createdAt: 0 },
          { id: 'm2', actorId: 'b', kind: 'dice', data: { total: 7 }, text: '7', createdAt: 1 },
        ];
        const { parts } = await t.invoke('render', { messages });
        check(parts.length > 0, 'expected a story to be drawn');
        check(
          parts.every((p) => p.kind.trim() !== ''),
          'expected every part to say what kind it is',
        );
      },
    },
  ],
});
