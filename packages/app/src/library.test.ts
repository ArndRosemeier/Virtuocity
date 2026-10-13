import { describe, expect, it } from 'vitest';
import type { Actor, NameConflict } from '@virtuocity/core';
import {
  Library,
  ModuleHost,
  SessionRuntime,
  coreModule,
  loadModules,
  memoryStore,
} from '@virtuocity/core';
import { keepLibrary, syncCast } from './library';

const host = loadModules(new ModuleHost(), [coreModule]);
const marlow: Actor = {
  id: 'marlow',
  controller: 'ai',
  personality: { name: 'Marlow', description: 'A sailor.' },
  skillIds: [],
};
const edited: Actor = { ...marlow, personality: { name: 'Marlow', description: 'A captain.' } };

/** A session saved with Marlow as he was, and a library where he was edited since. */
async function staleSession() {
  const library = new Library(memoryStore<unknown>());
  await library.saveActor(edited);
  const session = new SessionRuntime({ host, modelDefaults: () => ({}) });
  await session.join(marlow);
  return { library, session };
}

describe('bringing a loaded session in line with the library', () => {
  it("gives a stored session the library's current actor without asking", async () => {
    const { library, session } = await staleSession();
    await syncCast(library, session, keepLibrary);
    expect(session.actors).toEqual([edited]);
    expect(await library.actors()).toEqual([edited]);
  });

  it('asks which version to keep for a session from a file', async () => {
    const { library, session } = await staleSession();
    const asked: NameConflict[] = [];
    await syncCast(library, session, (conflicts) => {
      asked.push(...conflicts);
      return Promise.resolve({ marlow: 'replace' });
    });
    expect(asked.map((c) => c.incoming)).toEqual([marlow]);
    expect(session.actors).toEqual([marlow]);
    expect(await library.actors()).toEqual([marlow]);
  });
});
