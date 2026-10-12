import { action, check, defineContract, z } from '@virtuocity/core';

const part = z.object({
  kind: z.string().min(1).describe('Output kind, e.g. text or image'),
  data: z.unknown().describe('Whatever that kind of output holds'),
});

/**
 * Opens a new session with its premise. Deliberately content-neutral: a
 * premise may be text, a picture, sound, or anything a renderer can show,
 * so it fits a text story as well as an image-only or audio session.
 */
export const premiseContract = defineContract({
  name: 'premise',
  version: '1.0',
  description: 'Delivers the premise a session starts from, in any form.',
  actions: {
    premise: action({
      description: 'The premise the session starts from.',
      input: z.object({}),
      output: z.object({ parts: z.array(part).min(1).describe('The premise, as output parts') }),
    }),
  },
  conformance: [
    {
      name: 'delivers a premise as output parts',
      run: async (t) => {
        const { parts } = await t.invoke('premise', {});
        check(parts.length > 0, 'expected at least one part');
        check(
          parts.every((p) => p.kind.trim() !== ''),
          'expected every part to say what kind it is',
        );
      },
    },
  ],
});
