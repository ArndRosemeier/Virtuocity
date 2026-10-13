import { describe, expect, it } from 'vitest';
import type { Actor, NameConflict } from '@virtuocity/core';
import {
  CAST,
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

/** A loaded session holding a copy of Marlow, and a library with another version of him. */
async function sessionWithCopy() {
  const library = new Library(memoryStore<unknown>());
  const session = new SessionRuntime({ host, modelDefaults: () => ({}), actors: library.actor });
  await session.join(marlow);
  await library.saveActor(edited);
  return { library, session };
}

const castPayloads = (session: SessionRuntime) =>
  session.workspace.log
    .all()
    .filter((op) => op.docId === CAST)
    .map((op) => op.payload);

describe('moving the actor copies of a loaded session into the library', () => {
  it("takes the library's actor for a stored session without asking, and keeps no copy", async () => {
    const { library, session } = await sessionWithCopy();
    await syncCast(library, session, keepLibrary);
    expect(session.actors).toEqual([edited]);
    expect(await library.actors()).toEqual([edited]);
    expect(castPayloads(session)).toEqual([{ type: 'include', actorId: 'marlow' }]);
  });

  it('asks which version to keep for a session from a file', async () => {
    const { library, session } = await sessionWithCopy();
    const asked: NameConflict[] = [];
    await syncCast(library, session, (conflicts) => {
      asked.push(...conflicts);
      return Promise.resolve({ marlow: 'replace' });
    });
    expect(asked.map((c) => c.incoming)).toEqual([marlow]);
    expect(session.actors).toEqual([marlow]);
    expect(await library.actors()).toEqual([marlow]);
  });

  it('asks nothing when the copy is the same as the library actor', async () => {
    const library = new Library(memoryStore<unknown>());
    const session = new SessionRuntime({ host, modelDefaults: () => ({}), actors: library.actor });
    await session.join(marlow);
    await library.saveActor(marlow);
    await syncCast(library, session, () => Promise.reject(new Error('asked')));
    expect(castPayloads(session)).toEqual([{ type: 'include', actorId: 'marlow' }]);
  });
});
