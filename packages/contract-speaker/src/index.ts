import { action, check, contentSchema, defineContract, z } from '@virtuocity/core';

/**
 * Takes part in the session by saying something: a character's line, a
 * refined prompt, a writer's reply. The speaker reads the session itself, from
 * its actor's point of view, and says what comes next. What it says is not
 * tied to any kind of content. A session type that lists `speaker` among its
 * cast contracts lets speakers take turns; on its turn an actor posts what
 * `speak` would say.
 */
export const speakerContract = defineContract({
  name: 'speaker',
  version: '1.0',
  description: 'Says its part in the session when it is its turn.',
  actions: {
    speak: action({
      description: 'Read the session so far and say what this actor says next.',
      input: z.object({}),
      output: z.object({
        parts: z
          .array(contentSchema)
          .min(1)
          .describe('What the actor says, as content of any kind, each with a plain-text form'),
      }),
    }),
  },
  conformance: [
    {
      name: 'says something',
      run: async (t) => {
        const { parts } = await t.invoke('speak', {});
        check(parts.length > 0, 'expected the speaker to say something');
        check(
          parts.every((p) => p.kind.trim() !== ''),
          'expected every part to say what kind it is',
        );
      },
    },
  ],
});
