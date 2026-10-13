import { textContent } from './output';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { createAssetStore, findAssetIds } from './assets';
import { exportBundle, importBundle } from './bundle';
import { coreModule } from './core-module';
import { defineDocType } from './doc-type';
import { ModuleHost, loadModules } from './module';
import type { Operation } from './oplog';
import { migrateOperations, parseSavedSession } from './persistence';
import { SessionRuntime } from './runtime';
import { memoryStore } from './storage';

function runtime(host = loadModules(new ModuleHost(), [coreModule])) {
  let n = 0;
  return new SessionRuntime({
    host,
    modelDefaults: () => ({}),
    newId: () => `id${++n}`,
    now: () => 1000,
  });
}
const say = textContent;
const actor = {
  id: 'bard',
  controller: 'ai' as const,
  personality: { name: 'Lyra', description: '' },
  skillIds: [],
};

describe('save and load', () => {
  it('brings back every branch, the head, the cast and the cost', async () => {
    const a = runtime();
    await a.join(actor);
    const first = await a.post('user', say('one'));
    await a.post('user', say('two'));
    await a.rewindToMessage(first.id, { keepBranch: true });
    await a.post('user', say('alt'));
    const saved = JSON.parse(JSON.stringify(a.save())) as unknown;

    const b = runtime();
    await b.load(saved);
    expect(b.transcript().map((m) => m.data)).toEqual(['one', 'alt']);
    expect(b.actors.map((x) => x.personality.name)).toEqual(['Lyra']);
    expect(b.workspace.log.leaves()).toHaveLength(2);
    expect(b.save().operations).toEqual(a.save().operations);
  });

  it('rejects data that is not a session', async () => {
    await expect(runtime().load({ hello: 'world' })).rejects.toThrow(/Not a Virtuocity session/);
    const broken = { ...runtime().save(), head: 'missing' };
    await expect(runtime().load(broken)).rejects.toThrow(/Unknown head/);
  });
});

describe('migrateOperations', () => {
  const op = (docType: string, docVersion: number, payload: unknown): Operation => ({
    id: 'o1',
    parentId: null,
    docId: 'd',
    docType,
    docVersion,
    actorId: 'a',
    payload,
    at: 0,
  });
  const hpV2 = defineDocType<number, { readonly delta: number }>({
    id: 'hp',
    version: 2,
    description: 'Hit points; v1 called the field "add"',
    op: z.object({ delta: z.number() }),
    initial: () => 0,
    apply: (s, o) => s + o.delta,
    migrate: (payload) => ({ delta: (payload as { add: number }).add }),
  });
  const types = (id: string) => (id === 'hp' ? hpV2 : undefined);

  it('upgrades old payloads and keeps operations of uninstalled types untouched', () => {
    const [upgraded, foreign] = migrateOperations(
      [op('hp', 1, { add: 3 }), op('map', 7, 'x')],
      types,
    );
    expect(upgraded).toMatchObject({ docVersion: 2, payload: { delta: 3 } });
    expect(foreign).toMatchObject({ docVersion: 7, payload: 'x' });
  });

  it('refuses operations from a newer version than installed', () => {
    expect(() => migrateOperations([op('hp', 3, { delta: 1 })], types)).toThrow(/version 3/);
  });

  it('validates the shape of saved sessions', () => {
    expect(() => parseSavedSession({ format: 'virtuocity.session' })).toThrow();
  });
});

describe('assets and bundles', () => {
  const png = new Uint8Array([137, 80, 78, 71]);

  it('stores content once under its hash and finds references in payloads', async () => {
    const store = createAssetStore(memoryStore());
    const first = await store.put(png, 'image/png');
    const again = await store.put(png, 'image/png');
    expect(first.id).toMatch(/^sha256-[0-9a-f]{64}$/);
    expect(again.id).toBe(first.id);
    expect(findAssetIds([{ image: first.id }, 'sha256-nope'])).toEqual(new Set([first.id]));
  });

  it('exports a session with its assets and imports it elsewhere', async () => {
    const assets = createAssetStore(memoryStore());
    const picture = await assets.put(png, 'image/png');
    const a = runtime();
    await a.post('painter', { kind: 'image', data: picture.id, text: 'A picture' });
    const file = await exportBundle(a.save(), assets);

    const elsewhere = createAssetStore(memoryStore());
    const b = runtime();
    await b.load(await importBundle(file, elsewhere));
    expect(b.transcript()[0]?.data).toBe(picture.id);
    expect((await elsewhere.get(picture.id))?.bytes).toEqual(png);
    await expect(importBundle('{"format":"other"}', elsewhere)).rejects.toThrow(
      /Not a Virtuocity file/,
    );
  });
});
