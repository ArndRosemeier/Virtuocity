import { sessionTypeContract } from '@virtuocity/contract-session-type';
import { conformanceSuite, conformanceTarget } from '@virtuocity/core';
import { describe, expect, it } from 'vitest';
import { describeSettings, sessionTypeSkill } from './index';

describe('session type skill conforms to session-type', () => {
  const target = conformanceTarget(sessionTypeContract, { skills: [sessionTypeSkill] });
  for (const testCase of conformanceSuite(sessionTypeContract)) {
    it(`${testCase.contractId}: ${testCase.name}`, () => testCase.run(target));
  }
});

describe('session type settings', () => {
  it('describe nothing by default: no roles, every panel', () => {
    expect(describeSettings(undefined)).toEqual({ roles: [], panels: [] });
  });

  it('fill in defaults and leave out roles without a name', () => {
    const stored = {
      roles: [{ label: 'A narrator', speaks: true }, { label: ' ' }],
      panels: ['story', 'composer'],
    };
    expect(describeSettings(stored)).toEqual({
      roles: [{ label: 'A narrator', hint: '', speaks: true, needs: [], optional: false }],
      panels: ['story', 'composer'],
    });
  });
});
