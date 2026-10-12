import { action, check, defineContract, z } from '@virtuocity/core';

const beat = z.object({
  action: z.string().describe('What the player did'),
  text: z.string().describe('What the narrator told them'),
});

/** Runs an explorable world: tells the player what happens and where they are. */
export const narratorContract = defineContract({
  name: 'narrator',
  version: '1.0',
  description: 'Narrates an explorable world, one player action at a time.',
  actions: {
    narrate: action({
      description:
        'Tell the player what happens after their action, where they are now, and what they could do next.',
      input: z.object({
        action: z.string().min(1).describe('What the player does, e.g. "Open the door"'),
        location: z.string().optional().describe('Where the player is before acting'),
        recent: z.array(beat).max(20).default([]).describe('The latest beats, oldest first'),
        premise: z.string().optional().describe('What the world is about'),
      }),
      output: z.object({
        text: z.string().min(1).describe('What happens, in second person'),
        location: z.string().min(1).describe('Short name of where the player is now'),
        scene: z.string().min(1).describe('One sentence describing the place, for a picture'),
        actions: z
          .array(z.string().min(1).max(60))
          .min(1)
          .max(5)
          .describe('Short things the player could do next'),
      }),
    }),
  },
  conformance: [
    {
      name: 'narrates a first action with a place and next actions',
      run: async (t) => {
        const result = await t.invoke('narrate', { action: 'Look around.' });
        check(result.text.trim().length > 0, 'the narration is empty');
        check(result.location.trim().length > 0, 'the location is empty');
        check(result.actions.length > 0, 'no actions are offered');
      },
    },
    {
      name: 'continues from a location and recent beats',
      run: async (t) => {
        const result = await t.invoke('narrate', {
          action: 'Go through the door.',
          location: 'Cellar',
          recent: [{ action: 'Look around.', text: 'A damp cellar with one door.' }],
        });
        check(result.text.trim().length > 0, 'the narration is empty');
      },
    },
  ],
});

export type Narration = z.output<(typeof narratorContract.actions.narrate)['output']>;
export type NarrateInput = z.input<(typeof narratorContract.actions.narrate)['input']>;
