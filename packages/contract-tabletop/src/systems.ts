import { check, defineContract } from '@virtuocity/core';
import type { CheckResult, Checks, Outcome } from './rules';
import { OUTCOMES, eachCheck, tabletopRulesContract } from './rules';

/** Runs the GM and the players of a d20 game; it sets DCs and plays everyone else. */
export const gameMasterContract = defineContract({
  name: 'game-master',
  version: '1.0',
  description:
    'Runs a tabletop game by its rules: describes the world, plays everyone else, sets DCs.',
  extends: [tabletopRulesContract],
  actions: {},
});

/** Plays one character in a d20 game, by its rules. */
export const tabletopPlayerContract = defineContract({
  name: 'tabletop-player',
  version: '1.0',
  description: 'Plays one character at a tabletop game, by its rules.',
  extends: [tabletopRulesContract],
  actions: {},
});

const step = (outcome: Outcome, by: number): Outcome =>
  OUTCOMES[Math.min(3, Math.max(0, OUTCOMES.indexOf(outcome) - by))] ?? outcome;

/** Pathfinder 2e: beat the DC by 10 for a critical success, miss by 10 for a critical failure; a natural 20 or 1 moves it one step. */
function pf2eExpected({ natural, total, dc = 0 }: CheckResult): Outcome {
  const base: Outcome =
    total >= dc + 10
      ? 'critical success'
      : total >= dc
        ? 'success'
        : total <= dc - 10
          ? 'critical failure'
          : 'failure';
  return natural === 20 ? step(base, 1) : natural === 1 ? step(base, -1) : base;
}

/** D&D 5e: meet the DC to succeed; on an attack a natural 20 always hits critically and a 1 always misses. */
function dnd5eExpected({ natural, total, dc = 0 }: CheckResult, attack: boolean): Outcome {
  if (attack && natural === 20) return 'critical success';
  if (attack && natural === 1) return 'critical failure';
  return total >= dc ? 'success' : 'failure';
}

/** Checks against a range of DCs, each outcome compared with what the rules say. */
const outcomes =
  (expected: (r: CheckResult) => Outcome, attack = false) =>
  async (t: Checks) => {
    for (const dc of [5, 12, 18, 25, 30]) {
      await eachCheck(t, { bonus: 7, dc, attack }, 12, (r) => {
        const want = expected(r);
        check(
          r.outcome === want,
          `d20 ${r.natural}, total ${r.total} vs DC ${dc}: ${r.outcome}, not ${want}`,
        );
      });
    }
  };

const pf2eCases = [
  {
    name: 'grades checks in four degrees, ±10 and natural 20 or 1 moving one step',
    run: outcomes(pf2eExpected),
  },
];

const dnd5eCases = [
  { name: 'succeeds on meeting the DC', run: outcomes((r) => dnd5eExpected(r, false)) },
  {
    name: 'hits critically on a natural 20 and always misses on a 1 when attacking',
    run: outcomes((r) => dnd5eExpected(r, true), true),
  },
];

/** A Pathfinder Second Edition GM. */
export const pf2eGmContract = defineContract({
  name: 'pf2e-gm',
  version: '1.0',
  description: 'Runs a Pathfinder Second Edition game.',
  extends: [gameMasterContract],
  actions: {},
  conformance: pf2eCases,
});

/** A Pathfinder Second Edition player. */
export const pf2ePlayerContract = defineContract({
  name: 'pf2e-player',
  version: '1.0',
  description: 'Plays a character in a Pathfinder Second Edition game.',
  extends: [tabletopPlayerContract],
  actions: {},
  conformance: pf2eCases,
});

/** A D&D 5th edition (2014 rules) GM. */
export const dnd5eGmContract = defineContract({
  name: 'dnd5e-gm',
  version: '1.0',
  description: 'Runs a D&D 5th edition game by the 2014 rules.',
  extends: [gameMasterContract],
  actions: {},
  conformance: dnd5eCases,
});

/** A D&D 5th edition (2014 rules) player. */
export const dnd5ePlayerContract = defineContract({
  name: 'dnd5e-player',
  version: '1.0',
  description: 'Plays a character in a D&D 5th edition game by the 2014 rules.',
  extends: [tabletopPlayerContract],
  actions: {},
  conformance: dnd5eCases,
});

/** Every tabletop contract, parents first, for registering. */
export const tabletopContracts = [
  tabletopRulesContract,
  gameMasterContract,
  tabletopPlayerContract,
  pf2eGmContract,
  pf2ePlayerContract,
  dnd5eGmContract,
  dnd5ePlayerContract,
] as const;
