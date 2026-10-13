import type { Actor, SessionRuntime } from '@virtuocity/core';
import type { Setting } from './settings';
import { readSetting, writeSetting } from './settings';

/** The id of the person writing in every session. */
export const USER_ID = 'user';

/** The name the person goes by in new sessions: the last one they gave. */
export const PERSON_NAME: Setting = { key: 'virtuocity.personName', fallback: 'User' };

/** The person writing, under `name`; the AI actors see their lines under it. */
export function personActor(name = readSetting(PERSON_NAME)): Actor {
  return {
    id: USER_ID,
    controller: 'human',
    personality: { name: name.trim() || PERSON_NAME.fallback, description: '' },
    skillIds: [],
  };
}

/** The person's name in this session. */
export function personName(session: SessionRuntime): string {
  return session.actors.find((a) => a.id === USER_ID)?.personality.name ?? PERSON_NAME.fallback;
}

/** Renames the person in this session, and remembers the name for new sessions. */
export async function renamePerson(session: SessionRuntime, name: string): Promise<void> {
  const person = session.actors.find((a) => a.id === USER_ID) ?? personActor(name);
  await session.join({ ...person, personality: { ...person.personality, name: name.trim() } });
  writeSetting(PERSON_NAME, name.trim());
}
