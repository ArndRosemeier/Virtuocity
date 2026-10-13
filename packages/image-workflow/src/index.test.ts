import { illustratorContract } from '@virtuocity/contract-visual';
import type { Skill } from '@virtuocity/core';
import { ModuleHost, castStarter, implement, loadModules, parseRef } from '@virtuocity/core';
import { describe, expect, it } from 'vitest';
import { imageWorkflowModule, imageWorkflowType } from './index';

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
    const { castSkills } = imageWorkflowType.settings?.['session-type'] as { castSkills: string[] };
    expect(castSkills).toEqual(['illustrator']);
    expect(castStarter(host.starters.get('painter'), [painting])).toMatchObject({
      skillIds: ['illustrator'],
      settings: { illustrator: { automatic: false } },
    });
  });

  it('name every need of its roles as a contract reference', () => {
    const { roles } = imageWorkflowType.settings?.['session-type'] as {
      roles: { needs?: string[] }[];
    };
    for (const need of roles.flatMap((r) => r.needs ?? [])) {
      expect(() => parseRef(need)).not.toThrow();
    }
  });
});
