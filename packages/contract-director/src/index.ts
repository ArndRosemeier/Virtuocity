import { action, check, defineContract, z } from '@virtuocity/core';

const candidate = z.object({
  id: z.string().describe('The id of a member of the cast'),
  name: z.string().describe('What the member is called'),
  person: z.boolean().describe('A person, not an AI; picking them hands the turn back'),
});

export type DirectorCandidate = z.output<typeof candidate>;

/**
 * Decides who takes the next turn. Any actor serving it directs the session:
 * after a person acts or passes, it picks one member of the cast. Picking a
 * person hands the turn back, so the session waits for them. Sessions without
 * a director never pick anyone; people choose who speaks.
 */
export const directorContract = defineContract({
  name: 'director',
  version: '1.0',
  description: 'Picks who takes the next turn.',
  actions: {
    next: action({
      description:
        'Who of the candidates takes the next turn, given the session so far. Pick a person to wait for them.',
      input: z.object({
        candidates: z.array(candidate).min(1).describe('The cast: who may take the next turn'),
      }),
      output: z.object({
        next: z.string().describe('The id of the candidate who takes the next turn'),
      }),
    }),
  },
  conformance: [
    {
      name: 'picks one of the candidates',
      run: async (t) => {
        const candidates = [
          { id: 'you', name: 'You', person: true },
          { id: 'mira', name: 'Mira', person: false },
          { id: 'tobin', name: 'Tobin', person: false },
        ];
        const { next } = await t.invoke('next', { candidates });
        check(
          candidates.some((c) => c.id === next),
          `expected one of the candidates, got "${next}"`,
        );
      },
    },
    {
      name: 'picks the only candidate there is',
      run: async (t) => {
        const candidates = [{ id: 'you', name: 'You', person: true }];
        const { next } = await t.invoke('next', { candidates });
        check(next === 'you', `expected the only candidate, got "${next}"`);
      },
    },
  ],
});
