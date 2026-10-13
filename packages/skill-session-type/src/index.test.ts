import { sessionTypeContract } from '@virtuocity/core';
import { castStarter, conformanceSuite, conformanceTarget } from '@virtuocity/core';
import { describe, expect, it } from 'vitest';
import { describeSettings, openType, sessionTypeSkill } from './index';

describe('session type skill conforms to session-type', () => {
  const target = conformanceTarget(sessionTypeContract, { skills: [sessionTypeSkill] });
  for (const testCase of conformanceSuite(sessionTypeContract)) {
    it(`${testCase.contractId}: ${testCase.name}`, () => testCase.run(target));
  }
});

describe('session type settings', () => {
  it('cast talking actors by default, with no roles and every panel', () => {
    expect(describeSettings(undefined)).toEqual({
      castContracts: ['speaker@1.0'],
      roles: [],
      panels: [],
    });
  });

  it('fill in defaults and leave out roles without a name', () => {
    const stored = {
      castContracts: ['illustrator@1.0'],
      roles: [{ label: 'A narrator', cast: true }, { label: ' ' }],
      panels: ['story', 'composer'],
    };
    expect(describeSettings(stored)).toEqual({
      castContracts: ['illustrator@1.0'],
      roles: [{ label: 'A narrator', hint: '', cast: true, needs: [], optional: false }],
      panels: ['story', 'composer'],
    });
  });
});

describe('the Open session type', () => {
  it('shows every panel, casts talking actors and suggests nothing', () => {
    const open = castStarter(openType, [sessionTypeSkill]);
    expect(open?.skillIds).toEqual(['session-type']);
    expect(describeSettings(open?.settings?.['session-type'])).toEqual({
      castContracts: ['speaker@1.0'],
      roles: [],
      panels: [],
    });
  });
});
