import type { Actor, Skill } from '@virtuocity/core';
import { implement, sessionTypeContract } from '@virtuocity/core';

/** A session type for tests: actors with one of `castSkills` are cast, every panel shows. */
export function testTypeSkill(castSkills: string[] = []): Skill {
  return {
    id: 'test-type',
    name: 'Test type',
    backing: 'code',
    implements: [
      implement(sessionTypeContract, {
        describe: () => Promise.resolve({ castSkills, roles: [], panels: [] }),
      }),
    ],
  };
}

/** An actor of `testTypeSkill`. */
export const testType: Actor = {
  id: 'room',
  controller: 'ai',
  personality: { name: 'Room', description: '' },
  skillIds: ['test-type'],
};
