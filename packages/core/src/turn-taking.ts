import { z } from 'zod';
import { defineFlow } from './flow';

export type TurnTakingInput =
  { readonly kind: 'pass' } | { readonly kind: 'choose'; readonly actorId: string };

/**
 * The default flow: after the human acts or passes, one character speaks,
 * picked by the director (or chosen by the human), then the session pauses.
 */
export const turnTakingFlow = defineFlow<TurnTakingInput>({
  id: 'turn-taking',
  name: 'Turn taking',
  description: 'One character answers, then the story pauses for you.',
  input: z.discriminatedUnion('kind', [
    z.object({ kind: z.literal('pass') }),
    z.object({ kind: z.literal('choose'), actorId: z.string() }),
  ]),
  run: async (ctx, input) => {
    const next = input.kind === 'choose' ? input.actorId : (await ctx.pickNext())?.id;
    if (next !== undefined) await ctx.runTurn(next);
  },
});
