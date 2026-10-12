import { describe, expect, it } from 'vitest';
import { memoryStore } from '@virtuocity/core';
import type { StoredAsset } from '@virtuocity/core';
import { loadAll, readBackup, saveAll } from './backup';
import type { AppState } from './backup';

function state(settings: Record<string, string> = {}): AppState & { values: () => object } {
  let current = settings;
  return {
    sessions: memoryStore<unknown>(),
    library: memoryStore<unknown>(),
    assets: memoryStore<StoredAsset>(),
    settings: { read: () => current, replace: (next) => void (current = next) },
    values: () => current,
  };
}

describe('save all / load all', () => {
  it('round-trips every store and setting', async () => {
    const from = state({ 'virtuocity.theme': 'dark' });
    await from.sessions.set('current', { ops: [1, 2] });
    await from.library.set('Mira', { kind: 'actor', id: 'Mira' });
    await from.assets.set('sha256-ab', { mime: 'image/png', bytes: new Uint8Array([1, 2, 3]) });

    const to = state({ 'virtuocity.guide': 'off' });
    await to.sessions.set('old', 'gone');
    await to.library.set('Old', 'gone');
    await to.assets.set('sha256-cd', { mime: 'image/png', bytes: new Uint8Array([9]) });
    await loadAll(to, readBackup(await saveAll(from)));

    expect(await to.sessions.keys()).toEqual(['current']);
    expect(await to.sessions.get('current')).toEqual({ ops: [1, 2] });
    expect(await to.library.keys()).toEqual(['Mira']);
    expect(await to.assets.keys()).toEqual(['sha256-ab']);
    expect(await to.assets.get('sha256-ab')).toEqual({
      mime: 'image/png',
      bytes: new Uint8Array([1, 2, 3]),
    });
    expect(to.values()).toEqual({ 'virtuocity.theme': 'dark' });
  });

  it('rejects a zip that is not a backup', async () => {
    const { zipSync } = await import('fflate');
    expect(() => readBackup(zipSync({ 'other.txt': new Uint8Array([1]) }))).toThrow(
      'not a Virtuocity backup',
    );
  });
});
