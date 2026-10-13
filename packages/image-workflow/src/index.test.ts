import { illustratorContract } from '@virtuocity/contract-visual';
import type { Skill } from '@virtuocity/core';
import { ModuleHost, castStarter, implement, loadModules, parseRef } from '@virtuocity/core';
import { describe, expect, it } from 'vitest';
import { guidedIllustrationsType, imageWorkflowModule, imageWorkflowType } from './index';

const painting: Skill = {
  id: 'illustrator',
  name: 'Illustrator',
  backing: 'llm',
  implements: [
    implement(illustratorContract, {
      illustrate: () => Promise.reject(new Error('not painting in this test')),
    }),
  ],
};

describe('image workflow starters', () => {
  const host = loadModules(new ModuleHost(), [imageWorkflowModule]);

  it('cast illustrators and offer one that paints only on its turn', () => {
    const { castContracts } = imageWorkflowType.settings?.['session-type'] as {
      castContracts: string[];
    };
    expect(castContracts).toEqual(['illustrator@1.0']);
    expect(castStarter(host.starters.get('painter'), [painting])).toMatchObject({
      skillIds: ['illustrator'],
      settings: { illustrator: { automatic: false } },
    });
  });

  it('offer guided illustrations: a talking refiner is cast, the illustrator is support', () => {
    const { castContracts } = guidedIllustrationsType.settings?.['session-type'] as {
      castContracts: string[];
    };
    expect(castContracts).toEqual(['speaker@1.0']);
    expect(host.starters.get('prompt-refiner').speaks).toBe(true);
  });

  it('name every need of their roles as a contract reference', () => {
    for (const type of [imageWorkflowType, guidedIllustrationsType]) {
      const { roles } = type.settings?.['session-type'] as { roles: { needs?: string[] }[] };
      for (const need of roles.flatMap((r) => r.needs ?? [])) {
        expect(() => parseRef(need)).not.toThrow();
      }
    }
  });
});
