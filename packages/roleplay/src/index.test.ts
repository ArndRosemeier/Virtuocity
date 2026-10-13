import { premiseContract } from '@virtuocity/contract-premise';
import { sessionTypeContract } from '@virtuocity/core';
import type { Skill } from '@virtuocity/core';
import { ModuleHost, castStarter, implement, loadModules, parseRef } from '@virtuocity/core';
import { describe, expect, it } from 'vitest';
import { roleplayModule, roleplayType } from './index';

const talk: Skill = { id: 'talk', name: 'Talk', backing: 'llm', takeTurn: () => Promise.resolve() };
const typed: Skill = {
  id: 'session-type',
  name: 'Session type',
  backing: 'code',
  implements: [
    implement(sessionTypeContract, {
      describe: () => Promise.resolve({ castSkills: [], roles: [], panels: [] }),
    }),
  ],
};

describe('roleplay starters', () => {
  const host = loadModules(new ModuleHost(), [roleplayModule]);
  const cast = (id: string, skills: Skill[]) => castStarter(host.starters.get(id), skills);

  it('offer the Roleplay session type when a skill can describe it', () => {
    expect(cast('roleplay', [talk])).toBeUndefined();
    expect(cast('roleplay', [typed])).toMatchObject({
      personality: { name: 'Roleplay' },
      skillIds: ['session-type'],
    });
  });

  it('offer a narrator who talks, and a premise only when a skill can open a story', () => {
    expect(cast('narrator', [talk])?.skillIds).toEqual(['talk']);
    expect(cast('premise', [talk])).toBeUndefined();
  });

  it('name every need of the roleplay roles as a contract reference', () => {
    const { roles } = roleplayType.settings?.['session-type'] as {
      roles: { needs?: string[] }[];
    };
    const needs = roles.flatMap((r) => r.needs ?? []);
    expect(needs).toContain(premiseContract.id);
    for (const need of needs) expect(() => parseRef(need)).not.toThrow();
  });
});
