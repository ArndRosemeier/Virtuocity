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
  textContent,
  withActorsWritten,
} from '@virtuocity/core';
import { keepLibrary, syncCast } from './library';
import { SessionCatalog } from './sessions';
import { OPEN_SESSION, SessionSwitcher } from './switcher';
import { writeSetting } from './settings';

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
    await switcher.startNew('Voyage');
    await shown.join(marlow);
    await shown.post('you', textContent('hello'));
    await shown.runTurn('marlow');
    await expectNoCopies(library, switcher);

    await library.saveActor(described('A captain.'));
    expect(shown.actors).toEqual([described('A captain.')]);
    await retryMessage(shown, shown.transcript()[1]?.id ?? '');
    expect(shown.actors).toEqual([described('A captain.')]);
    await expectNoCopies(library, switcher);

    await switcher.catalog.setTemplate(switcher.openId ?? '', true);
    await switcher.copy(switcher.openId ?? '', 'Second voyage');
    expect(shown.actors).toEqual([described('A captain.')]);
    await expectNoCopies(library, switcher);
  });

  it('moves the actors of a file into the library, keeping no copy', async () => {
    const { library, shown, switcher } = await setup();
    const assets = createAssetStore(memoryStore());
    await switcher.startNew('Voyage', (r) => r.join(marlow));
    const file = withActorsWritten(shown.save(), (id) =>
      id === 'marlow' ? described('From a file.') : undefined,
    );
    await switcher.startFrom(
      'Loaded',
      await importBundle(await exportBundle(file, assets), assets),
    );
    expect(await library.actors()).toEqual([described('From a file.')]);
    await expectNoCopies(library, switcher);
  });

  it('converts a session saved with copies, the library winning', async () => {
    const { library, shown, switcher } = await setup();
    await switcher.startNew('Voyage', (r) => r.join(marlow));
    const old: SavedSession = withActorsWritten(shown.save(), () => described('An old copy.'));
    const id = await switcher.catalog.create('Old', old);
    await switcher.open(id);
    expect(shown.actors).toEqual([marlow]);
    await expectNoCopies(library, switcher);
  });
});
