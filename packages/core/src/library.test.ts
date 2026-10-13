import { describe, expect, it, vi } from 'vitest';
import type { Actor } from './actor';
import { sameActor, sameName } from './actor-names';
import { Library, NameTakenError } from './library';
import type { ResolveConflicts } from './library-import';
import { memoryStore } from './storage';

const mira: Actor = {
  id: 'mira',
  controller: 'ai',
  personality: { name: 'Mira', description: 'A wanderer.' },
  skillIds: ['conversation'],
  settings: { conversation: { length: 'short' } },
};
const renamed = (actor: Actor, name: string, id = actor.id): Actor => ({
  ...actor,
  id,
  personality: { ...actor.personality, name },
});

function library(store = memoryStore<unknown>()) {
  let n = 0;
  let t = 100;
  return new Library(store, { newId: () => `item-${++n}`, now: () => t++ });
}

const keep: ResolveConflicts = () => Promise.resolve({});

describe('names', () => {
  it('compare without case and extra spaces', () => {
    expect(sameName('Wren', '  wren ')).toBe(true);
    expect(sameName('Old  Wren', 'old wren')).toBe(true);
    expect(sameName('Wren', 'Wren 2')).toBe(false);
  });

  it('tell actors apart by everything but the id', () => {
    expect(sameActor(mira, { ...mira, id: 'other' })).toBe(true);
    expect(sameActor(mira, renamed(mira, 'Mara'))).toBe(false);
  });
});

describe('library', () => {
  it('keeps actors under their own ids', async () => {
    const lib = library();
    await lib.saveActor(mira);
    expect(await lib.list()).toEqual([{ kind: 'actor', id: 'mira', savedAt: 100, actor: mira }]);
  });

  it('refuses a name another actor has, but saves edits under the same name', async () => {
    const lib = library();
    await lib.saveActor(mira);
    await expect(lib.saveActor(renamed(mira, ' mira ', 'other'))).rejects.toThrow(NameTakenError);
    await lib.saveActor({ ...mira, skillIds: [] });
    expect(await lib.actors()).toEqual([{ ...mira, skillIds: [] }]);
    expect(await lib.nameTaken('MIRA')).toBe(true);
    expect(await lib.nameTaken('Mira', 'mira')).toBe(false);
  });

  it('removes actors, and tells listeners about every change', async () => {
    const lib = library();
    const listener = vi.fn();
    const stop = lib.subscribe(listener);
    await lib.saveActor(mira);
    await lib.remove('mira');
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
    expect((await lib.list()).map((i) => i.id)).toEqual(['mira']);
  });
});

describe('adopting actors', () => {
  it('adds new names and links the same actor under the incoming id', async () => {
    const lib = library();
    await lib.saveActor(mira);
    const wren = renamed(mira, 'Wren', 'wren');
    const adopted = await lib.adopt([{ ...mira, id: 'mira-2' }, wren], keep);
    expect(adopted.map((a) => a.id)).toEqual(['mira-2', 'wren']);
    expect((await lib.actors()).map((a) => a.id).sort()).toEqual(['mira-2', 'wren']);
  });

  it('asks about a taken name with different details, and keeps or replaces', async () => {
    const lib = library();
    await lib.saveActor(mira);
    const other = { ...mira, id: 'mira-2', skillIds: ['writer'] };
    const resolve = vi.fn<ResolveConflicts>(() => Promise.resolve({}));
    expect(await lib.adopt([other], resolve)).toEqual([{ ...mira, id: 'mira-2' }]);
    expect(resolve).toHaveBeenCalledWith([
      expect.objectContaining({ incoming: other, existing: mira }),
    ]);
    const replace: ResolveConflicts = () => Promise.resolve({ 'mira-3': 'replace' });
    const third = { ...other, id: 'mira-3' };
    expect(await lib.adopt([third], replace)).toEqual([third]);
    expect(await lib.actors()).toEqual([third]);
  });

  it('moves an unrelated actor aside when its id is needed', async () => {
    const lib = library();
    await lib.saveActor(renamed(mira, 'Wren', 'x'));
    await lib.saveActor(mira);
    await lib.adopt([renamed(mira, 'Mira', 'x')], keep);
    const names = (await lib.actors()).map((a) => [a.id, a.personality.name]);
    expect(names.sort()).toEqual([
      ['item-1', 'Wren'],
      ['x', 'Mira'],
    ]);
  });
});

describe('older libraries', () => {
  it('get unique names and actor ids that match, and lose their saved setups', async () => {
    const store = memoryStore<unknown>();
    await store.set('a', { kind: 'actor', id: 'a', savedAt: 1, actor: mira });
    await store.set('b', { kind: 'actor', id: 'b', savedAt: 2, actor: mira });
    await store.set('s', { kind: 'setup', id: 's', savedAt: 3, actorIds: ['a'] });
    const lib = library(store);
    await lib.migrate();
    const actors = await lib.actors();
    expect(actors.map((a) => [a.id, a.personality.name]).sort()).toEqual([
      ['a', 'Mira'],
      ['b', 'Mira 2'],
    ]);
    expect(await store.get('s')).toBeUndefined();
  });

  it('export and import with the same rules', async () => {
    const source = library();
    await source.saveActor(mira);
    const target = library();
    expect(await target.importText(await source.exportText(), keep)).toBe(1);
    expect((await target.list()).map((i) => i.id)).toEqual(['mira']);
    await expect(target.importText('{"format":"other"}', keep)).rejects.toThrow(
      'Not a Virtuocity library',
    );
  });
});

describe('upgrading actors', () => {
  const upgrade = (actor: Actor): Actor => ({
    ...actor,
    skillIds: actor.skillIds.map((id) => (id === 'old' ? 'new' : id)),
  });
  const old = { ...mira, skillIds: ['old'] };

  it('upgrades stored actors when migrating, and incoming ones when adopting', async () => {
    const store = memoryStore<unknown>();
    await library(store).saveActor(old);
    const lib = new Library(store, { upgrade });
    await lib.migrate();
    expect((await lib.actors())[0]?.skillIds).toEqual(['new']);
    const [adopted] = await lib.adopt([old], keep);
    expect(adopted?.skillIds).toEqual(['new']);
  });
});
