import { spaceContract } from '@virtuocity/contract-space';
import { conformanceSuite, conformanceTarget } from '@virtuocity/core';
import { describe, expect, it } from 'vitest';
import { canvasSkill } from './index';

describe('canvas conforms to space', () => {
  const target = conformanceTarget(spaceContract, { skills: [canvasSkill] });
  for (const testCase of conformanceSuite(spaceContract)) {
    it(`${testCase.contractId}: ${testCase.name}`, () => testCase.run(target));
  }

  it('starts blank', async () => {
    const fresh = conformanceTarget(spaceContract, { skills: [canvasSkill] });
    await expect(fresh.invoke('fill', {})).resolves.toEqual({ parts: [] });
  });
});
