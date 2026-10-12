import { IMAGE_PART, action, check, defineChannel, defineContract, z } from '@virtuocity/core';

/** A picture of where the story is now, replaced as the story moves on. */
export const sceneChannel = defineChannel({
  id: 'scene',
  title: 'Scene',
  description: 'A picture of where the story is now.',
  accepts: [IMAGE_PART],
});

const picture = z.object({
  assetId: z
    .string()
    .regex(/^sha256-[0-9a-f]{64}$/)
    .describe('The stored picture'),
  mime: z.string().describe('For example image/png'),
  alt: z
    .string()
    .min(1)
    .describe('A short description of the picture, for people who cannot see it'),
});

export type Picture = z.infer<typeof picture>;

/** Turns a description into a picture kept in the session's asset store. */
export const illustratorContract = defineContract({
  name: 'illustrator',
  version: '1.0',
  description: 'Draws a picture from a description of a scene, person or thing.',
  actions: {
    illustrate: action({
      description: 'Draw a picture of what is described.',
      input: z.object({
        description: z.string().min(1).describe('What to draw'),
        style: z.string().optional().describe('For example: ink sketch, watercolour, photo'),
      }),
      output: picture,
    }),
  },
  outputs: ['image'],
  conformance: [
    {
      name: 'returns a stored image with a description',
      run: async (t) => {
        const result = await t.invoke('illustrate', { description: 'A lantern on a stone wall' });
        check(result.mime.startsWith('image/'), `expected an image, got ${result.mime}`);
        check(result.alt.trim() !== '', 'expected a description of the picture');
      },
    },
  ],
});
