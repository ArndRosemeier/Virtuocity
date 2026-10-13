import { action, check, defineContract, z } from '@virtuocity/core';

export const OUTCOMES = ['critical success', 'success', 'failure', 'critical failure'] as const;
export type Outcome = (typeof OUTCOMES)[number];

export const DIFFICULTIES = [
  'very easy',
  'easy',
  'standard',
  'hard',
  'very hard',
  'extreme',
] as const;
export const RANKS = ['untrained', 'trained', 'expert', 'master', 'legendary'] as const;

const checkInput = z.object({
  bonus: z.number().int().describe('Everything added to the d20: modifiers, proficiency, items'),
  dc: z.number().int().optional().describe('The DC or AC to beat, when known'),
  edge: z
    .enum(['advantage', 'disadvantage'])
    .optional()
    .describe('Roll two d20 and keep the higher (advantage, PF2E fortune) or lower (misfortune)'),
  attack: z.boolean().optional().describe('An attack roll, where a natural 20 or 1 matters'),
});

const checkResult = z.object({
  rolls: z.array(z.number().int()).readonly().describe('Every d20 rolled'),
  natural: z.number().int().describe('The d20 kept'),
  total: z.number().int(),
  dc: z.number().int().optional(),
  outcome: z.enum(OUTCOMES).optional().describe('Only when a DC was given'),
});

export type CheckInput = z.input<typeof checkInput>;
export type CheckResult = z.infer<typeof checkResult>;

/** Whatever can roll checks, e.g. a contract's conformance target. */
export interface Checks {
  invoke(action: 'check', input: CheckInput): Promise<CheckResult>;
}

/** Rolls `times` checks against `dc` and hands each to `expect`. */
export async function eachCheck(
  t: Checks,
  input: CheckInput,
  times: number,
  expect: (r: CheckResult) => void,
): Promise<void> {
  for (let i = 0; i < times; i++) expect(await t.invoke('check', input));
}

/**
 * The mechanics of a d20 tabletop game: checks, DCs and proficiency. Every
 * game system implements it its own way (degrees of success, advantage);
 * a GM or player skill offers it to its actor as tools.
 */
export const tabletopRulesContract = defineContract({
  name: 'tabletop-rules',
  version: '1.0',
  description: 'Rolls checks, sets DCs and works out proficiency by the rules of a d20 game.',
  actions: {
    check: action({
      description:
        'Roll a d20 check, saving throw or attack: d20 + bonus against a DC, with the outcome by the rules.',
      input: checkInput,
      output: checkResult,
    }),
    difficulty: action({
      description:
        'The DC for a task of some difficulty, by the rules (and level, where it counts).',
      input: z.object({
        difficulty: z.enum(DIFFICULTIES),
        level: z.number().int().min(0).max(25).optional().describe('Level of the task or creature'),
      }),
      output: z.object({ dc: z.number().int() }),
    }),
    proficiency: action({
      description: 'The proficiency bonus of a character of some level and rank of training.',
      input: z.object({
        level: z.number().int().min(1).max(20),
        rank: z
          .enum(RANKS)
          .describe('In D&D 5e: trained = proficient, expert and above = expertise'),
      }),
      output: z.object({ bonus: z.number().int() }),
    }),
  },
  conformance: [
    {
      name: 'adds the bonus to the kept d20',
      run: (t) =>
        eachCheck(t, { bonus: 5 }, 20, (r) => {
          check(r.natural >= 1 && r.natural <= 20, `d20 out of range: ${r.natural}`);
          check(r.total === r.natural + 5, `total ${r.total} is not ${r.natural} + 5`);
        }),
    },
    {
      name: 'keeps the higher of two d20 with advantage, the lower with disadvantage',
      run: async (t) => {
        await eachCheck(t, { bonus: 0, edge: 'advantage' }, 10, (r) =>
          check(r.rolls.length === 2 && r.natural === Math.max(...r.rolls), 'not the higher'),
        );
        await eachCheck(t, { bonus: 0, edge: 'disadvantage' }, 10, (r) =>
          check(r.rolls.length === 2 && r.natural === Math.min(...r.rolls), 'not the lower'),
        );
      },
    },
    {
      name: 'says how a check went only when it has a DC',
      run: async (t) => {
        await eachCheck(t, { bonus: 0 }, 5, (r) =>
          check(r.outcome === undefined, 'no DC, no outcome'),
        );
        await eachCheck(t, { bonus: 0, dc: 10 }, 5, (r) =>
          check(r.outcome !== undefined, 'no outcome'),
        );
      },
    },
    {
      name: 'asks more of harder tasks',
      run: async (t) => {
        const dcs = await Promise.all(
          DIFFICULTIES.map((difficulty) => t.invoke('difficulty', { difficulty, level: 5 })),
        );
        const rising = dcs.every((d, i) => i === 0 || d.dc > (dcs[i - 1]?.dc ?? 0));
        check(rising, `DCs do not rise: ${dcs.map((d) => d.dc).join(', ')}`);
      },
    },
    {
      name: 'gives untrained nothing and never less for a higher rank',
      run: async (t) => {
        const bonuses = await Promise.all(
          RANKS.map((rank) => t.invoke('proficiency', { level: 5, rank })),
        );
        check(bonuses[0]?.bonus === 0, 'untrained should add nothing');
        const rising = bonuses.every((b, i) => i === 0 || b.bonus >= (bonuses[i - 1]?.bonus ?? 0));
        check(rising, `proficiency falls with rank: ${bonuses.map((b) => b.bonus).join(', ')}`);
      },
    },
  ],
});
