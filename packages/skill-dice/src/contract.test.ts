import { diceRollerContract } from '@virtuocity/contract-dice';
import { conformanceSuite, conformanceTarget, seededRandom } from '@virtuocity/core';
import { describe, it } from 'vitest';
import { createDiceSkill } from './index';

describe('dice skill conforms to dice-roller', () => {
  const target = conformanceTarget(diceRollerContract, {
    skills: [createDiceSkill(seededRandom(1))],
  });
  for (const testCase of conformanceSuite(diceRollerContract)) {
    it(`${testCase.contractId}: ${testCase.name}`, () => testCase.run(target));
  }
});
