import { describe, expect, it, vi } from 'vitest';
import type { Actor } from './actor';
import { Library } from './library';
import { memoryStore } from './storage';

const mira: Actor = {
  id: 'mira',
  controller: 'ai',
  personality: { name: 'Mira', description: 'A wanderer.' },
  skillIds: ['conversation'],
  settings: { conversation: { length: 'short' } },
};

function library(store = memoryStore<unknown>()) {
  let n = 0;
  let t = 100;
  return new Library(store, { newId: () => `item-${++n}`, now: () => t++ });
}

describe('library', () => {
  it('keeps actors and setups, newest first', async () => {
    const lib = library();
    await lib.saveActor(mira);
    await lib.saveSetup({
      name: 'Gate',
      description: 'At the gate',
      blueprintId: 'roleplay',
      actors: [mira],
    });
    const [setup, actor] = await lib.list();
    expect(setup).toEqual({
      kind: 'setup',
      id: 'item-2',
      savedAt: 101,
      name: 'Gate',
      description: 'At the gate',
      blueprintId: 'roleplay',
      actors: [mira],
    });
    expect(actor).toEqual({ kind: 'actor', id: 'item-1', savedAt: 100, actor: mira });
  });

  it('removes items and tells listeners about every change', async () => {
    const lib = library();
    const listener = vi.fn();
    const stop = lib.subscribe(listener);
    const saved = await lib.saveActor(mira);
    await lib.remove(saved.id);
    expect(await lib.list()).toEqual([]);
    expect(listener).toHaveBeenCalledTimes(2);
    stop();
    await lib.saveActor(mira);
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it('skips stored items that are not valid', async () => {
    const store = memoryStore<unknown>();
    await store.set('junk', { kind: 'actor', id: 'junk' });
    const lib = library(store);
    await lib.saveActor(mira);
    expect((await lib.list()).map((i) => i.id)).toEqual(['item-1']);
  });

  it('exports and imports the whole library', async () => {
    const source = library();
    await source.saveActor(mira);
    await source.saveSetup({ name: 'Solo', description: '', actors: [mira] });
    const target = library();
    expect(await target.importText(await source.exportText())).toBe(2);
    expect(await target.list()).toEqual(await source.list());
    await expect(target.importText('{"format":"other"}')).rejects.toThrow(
      'Not a Virtuocity library',
    );
  });
});
