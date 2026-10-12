import { illustratorContract } from '@virtuocity/contract-visual';
import type { Skill } from '@virtuocity/core';
import {
  ModuleHost,
  blueprintProblems,
  defaultChoices,
  implement,
  loadModules,
} from '@virtuocity/core';
import { describe, expect, it } from 'vitest';
import { roleplayModule } from './index';

const talk: Skill = { id: 'talk', name: 'Talk', backing: 'llm', takeTurn: () => Promise.resolve() };
const paint: Skill = {
  id: 'paint',
  name: 'Paint',
  backing: 'llm',
  implements: [
    implement(illustratorContract, {
      illustrate: () => Promise.resolve({ assetId: 'a', mime: 'image/png', alt: 'A picture' }),
    }),
  ],
};

describe('roleplay blueprint', () => {
  const host = loadModules(new ModuleHost(), [roleplayModule]);
  const blueprint = host.blueprints.get('roleplay');

  it('needs a skill that takes turns', () => {
    expect(blueprintProblems(blueprint, [paint])).toHaveLength(2);
    expect(blueprintProblems(blueprint, [talk])).toEqual([]);
  });

  it('adds the illustrator only when a skill can paint', () => {
    expect(defaultChoices(blueprint, [talk]).illustrator?.included).toBe(false);
    expect(defaultChoices(blueprint, [talk, paint]).illustrator).toEqual({
      included: true,
      skillIds: ['paint'],
    });
  });
});
