import { describe, expect, it } from 'vitest';
import type { Actor, SavedSession, Skill } from '@virtuocity/core';
import {
  Library,
  ModuleHost,
  SessionRuntime,
  actorCopies,
  coreModule,
  createAssetStore,
  exportBundle,
  importBundle,
  loadModules,
  memoryStore,
  parseSavedSession,
  retryMessage,
  startSession,
  textContent,
  withActorsWritten,
} from '@virtuocity/core';
import { keepLibrary, syncCast } from './library';
import { SessionCatalog } from './sessions';
import { OPEN_SESSION, SessionSwitcher, typeDeps } from './switcher';
import { writeSetting } from './settings';
import { testType, testTypeSkill } from './testTypes';

/**
 * The app's core rule, checked across the flows that touch actors: one name is
 * one actor, kept only in the library. No stored session may ever hold a copy
 * of a library actor (by id or by name); only files carry copies.
 */

let take = 0;
const counting: Skill = {
  id: 'counting',
  name: 'Counting',
  backing: 'code',
  takeTurn: async (ctx) => {
    await ctx.post(textContent(`take ${++take}`));
  },
};
const host = loadModules(new ModuleHost(), [coreModule]);
host.skills.register(counting);
host.skills.register(testTypeSkill(['counting']));

const marlow: Actor = {
  id: 'marlow',
  controller: 'ai',
  personality: { name: 'Marlow', description: 'A sailor.' },
  skillIds: ['counting'],
};
const described = (description: string): Actor => ({
  ...marlow,
  personality: { name: 'Marlow', description },
});

async function setup() {
  writeSetting(OPEN_SESSION, '');
  const library = new Library(memoryStore<unknown>());
  await library.saveActor(marlow);
  await library.saveActor(testType);
  const runtime = () =>
    new SessionRuntime({ host, modelDefaults: () => ({}), actors: library.actor });
  const shown = runtime();
  let n = 0;
  const switcher = new SessionSwitcher({
    runtime: shown,
    catalog: new SessionCatalog(memoryStore<unknown>(), () => `s${++n}`),
    prepare: (r, fromFile) =>
      syncCast(library, r, fromFile ? () => Promise.resolve({ marlow: 'replace' }) : keepLibrary),
    scratch: runtime,
    ...typeDeps(
      () => host.skills.list(),
      () => library.actors(),
    ),
  });
  return { library, shown, switcher };
}

/** Fails with the offending copies if any stored session holds a library actor. */
async function expectNoCopies(library: Library, switcher: SessionSwitcher) {
  await switcher.flush();
  const actors = await library.actors();
  for (const entry of await switcher.catalog.list()) {
    const saved = parseSavedSession((await switcher.catalog.get(entry.id))?.state);
    expect(actorCopies(saved.operations, actors), entry.name).toEqual([]);
  }
}

describe('one name, one actor', () => {
  it('keeps no actor copies through adding, talking, editing, retrying and templates', async () => {
    const { library, shown, switcher } = await setup();
    await switcher.startNew('Voyage', (r) => startSession(r, [testType]));
    await shown.join(marlow);
    await shown.post('you', textContent('hello'));
    await shown.runTurn('marlow');
    await expectNoCopies(library, switcher);

    await library.saveActor(described('A captain.'));
    expect(shown.actors).toEqual([testType, described('A captain.')]);
    await retryMessage(shown, shown.transcript()[1]?.id ?? '');
    expect(shown.actors).toEqual([testType, described('A captain.')]);
    await expectNoCopies(library, switcher);

    await switcher.catalog.setTemplate(switcher.openId ?? '', true);
    await switcher.copy(switcher.openId ?? '', 'Second voyage');
    expect(shown.actors).toEqual([testType, described('A captain.')]);
    await expectNoCopies(library, switcher);
  });

  it('moves the actors of a file into the library, keeping no copy', async () => {
    const { library, shown, switcher } = await setup();
    const assets = createAssetStore(memoryStore());
    await switcher.startNew('Voyage', (r) => startSession(r, [testType, marlow]));
    const file = withActorsWritten(shown.save(), (id) =>
      id === 'marlow' ? described('From a file.') : id === 'room' ? testType : undefined,
    );
    await switcher.startFrom(
      'Loaded',
      await importBundle(await exportBundle(file, assets), assets),
    );
    expect(await library.actors()).toEqual([described('From a file.'), testType]);
    await expectNoCopies(library, switcher);
  });

  it('converts a session saved with copies, the library winning', async () => {
    const { library, shown, switcher } = await setup();
    await switcher.startNew('Voyage', (r) => startSession(r, [testType, marlow]));
    const old: SavedSession = withActorsWritten(shown.save(), (id) =>
      id === 'marlow' ? described('An old copy.') : undefined,
    );
    const id = await switcher.catalog.create('Old', old);
    await switcher.open(id);
    expect(shown.actors).toEqual([testType, marlow]);
    await expectNoCopies(library, switcher);
  });
});
