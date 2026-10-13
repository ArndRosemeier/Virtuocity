import type { Actor, Skill } from '@virtuocity/core';
import { implement, sessionTypeContract } from '@virtuocity/core';

/** A session type for tests: actors serving one of `castContracts` are cast, every panel shows. */
export function testTypeSkill(castContracts: string[] = []): Skill {
  return {
    id: 'test-type',
    name: 'Test type',
    backing: 'code',
    implements: [
      implement(sessionTypeContract, {
        describe: () => Promise.resolve({ castContracts, roles: [], panels: [] }),
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
