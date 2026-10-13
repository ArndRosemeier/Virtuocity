import {
  dnd5eGmContract,
  dnd5ePlayerContract,
  pf2eGmContract,
  pf2ePlayerContract,
} from '@virtuocity/contract-tabletop';
import {
  conformanceSuite,
  conformanceTarget,
  instructionsContract,
  seededRandom,
} from '@virtuocity/core';
import { describe, expect, it } from 'vitest';
import { createTabletopSkills } from './index';

const skills = createTabletopSkills(seededRandom(7));
const contracts = [pf2eGmContract, pf2ePlayerContract, dnd5eGmContract, dnd5ePlayerContract];

describe.each(skills.map((skill, i) => [skill.name, skill, contracts[i]] as const))(
  'the %s skill',
  (_name, skill, contract) => {
    if (!contract) throw new Error('every seat has a contract');
    const target = conformanceTarget(contract, { skills: [skill] });
    for (const testCase of conformanceSuite(contract)) {
      it(`${testCase.contractId}: ${testCase.name}`, () => testCase.run(target));
    }
    const rules = conformanceTarget(instructionsContract, { skills: [skill] });
    for (const testCase of conformanceSuite(instructionsContract)) {
      it(`${testCase.contractId}: ${testCase.name}`, () => testCase.run(rules));
    }

    it('gives its rules to its own actor only', async () => {
      const own = await rules.invoke('instructions', { actorId: 'subject' });
      const other = await rules.invoke('instructions', { actorId: 'someone else' });
      expect(own.text).toMatch(skill.id.endsWith('gm') ? /game master/ : /player/);
      expect(other.text).toBe('');
    });
  },
);
