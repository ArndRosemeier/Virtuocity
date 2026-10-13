import { SessionRuntime } from '@virtuocity/core';
import { describe, expect, it } from 'vitest';
import { createHost } from './host';
import { PERSON_NAME, USER_ID, personActor, personName, renamePerson } from './personName';
import { readSetting } from './settings';

describe("the person's name", () => {
  it('is User until the person gives one', () => {
    expect(personActor('').personality.name).toBe('User');
    expect(personActor('Arnd').personality.name).toBe('Arnd');
  });

  it('renames the person in the session and is kept for new sessions', async () => {
    const session = new SessionRuntime({ host: createHost(), modelDefaults: () => ({}) });
    await session.join(personActor('User'));
    await renamePerson(session, ' Arnd ');
    expect(personName(session)).toBe('Arnd');
    expect(session.actors.filter((a) => a.id === USER_ID)).toHaveLength(1);
    expect(readSetting(PERSON_NAME)).toBe('Arnd');
    expect(personActor().personality.name).toBe('Arnd');
  });
});
