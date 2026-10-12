import { action, check, defineContract, z } from '@virtuocity/core';

const roll = z.object({
  notation: z.string(),
  rolls: z.array(z.number().int().positive()).readonly(),
  modifier: z.number().int(),
  total: z.number().int(),
});

export type DiceRollResult = z.infer<typeof roll>;

/** Rolls dice from standard notation (`2d6+3`, `d20`). */
export const diceRollerContract = defineContract({
  name: 'dice-roller',
  version: '1.0',
  description: 'Rolls dice written in standard notation such as 2d6+3.',
  actions: {
    roll: action({
      description: 'Roll dice in standard notation and report each die and the total.',
      input: z.object({ notation: z.string().describe('For example 2d6+3 or d20') }),
      output: roll,
    }),
  },
  conformance: [
    {
      name: 'rolls the requested number of dice within their sides',
      run: async (t) => {
        const result = await t.invoke('roll', { notation: '4d6' });
        check(result.rolls.length === 4, `expected 4 dice, got ${result.rolls.length}`);
        check(
          result.rolls.every((r) => r >= 1 && r <= 6),
          `die out of range: ${result.rolls.join(', ')}`,
        );
      },
    },
    {
      name: 'adds the modifier to the total',
      run: async (t) => {
        const result = await t.invoke('roll', { notation: '2d8-1' });
        const sum = result.rolls.reduce((a, b) => a + b, 0);
        check(result.modifier === -1, `expected modifier -1, got ${result.modifier}`);
        check(result.total === sum - 1, `total ${result.total} is not ${sum} - 1`);
      },
    },
    {
      name: 'rejects invalid notation',
      run: async (t) => {
        const failed = await t.invoke('roll', { notation: 'banana' }).then(
          () => false,
          () => true,
        );
        check(failed, 'invalid notation should fail');
      },
    },
  ],
});
