import { action, check, contentSchema, defineContract, z } from '@virtuocity/core';

/**
 * Opens a new session with its premise. Deliberately content-neutral: a
 * premise is one or more messages of any kind (text, a picture, sound), so it
 * fits a text story as well as an image-only or audio session. Version 2
 * delivers messages, each with its text form, instead of bare output parts.
 */
export const premiseContract = defineContract({
  name: 'premise',
  version: '2.0',
  description: 'Delivers the premise a session starts from, in any form.',
  actions: {
    premise: action({
      description: 'The premise the session starts from.',
      input: z.object({}),
      output: z.object({
        messages: z
          .array(contentSchema)
          .min(1)
          .describe('The premise, as messages of any kind, each with its text form'),
      }),
    }),
  },
  conformance: [
    {
      name: 'delivers a premise as messages',
      run: async (t) => {
        const { messages } = await t.invoke('premise', {});
        check(messages.length > 0, 'expected at least one message');
        check(
          messages.every((m) => m.kind.trim() !== ''),
          'expected every message to say what kind it is',
        );
      },
    },
  ],
});
