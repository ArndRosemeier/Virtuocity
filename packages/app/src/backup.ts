import { strFromU8, strToU8, unzipSync, zipSync } from 'fflate';
import { z } from '@virtuocity/core';
import type { KeyValueStore, StoredAsset } from '@virtuocity/core';

/** Everything the app keeps: its stores and its settings (the OpenRouter key never included). */
export interface AppState {
  readonly sessions: KeyValueStore<unknown>;
  readonly library: KeyValueStore<unknown>;
  readonly assets: KeyValueStore<StoredAsset>;
  readonly settings: {
    read(): Record<string, string>;
    replace(values: Record<string, string>): void;
  };
}

const MANIFEST = 'virtuocity-backup.json';
const ASSET_DIR = 'assets/';

const manifestSchema = z.object({
  format: z.literal('virtuocity.backup'),
  formatVersion: z.literal(1),
  settings: z.record(z.string(), z.string()),
  sessions: z.record(z.string(), z.unknown()),
  library: z.record(z.string(), z.unknown()),
  /** Asset id to mime type; the bytes are in `assets/<id>`. */
  assets: z.record(z.string(), z.string()),
});

async function entries<T>(store: KeyValueStore<T>): Promise<Record<string, T>> {
  const all: Record<string, T> = {};
  for (const key of await store.keys()) {
    const value = await store.get(key);
    if (value !== undefined) all[key] = value;
  }
  return all;
}

async function replaceStore<T>(store: KeyValueStore<T>, values: Record<string, T>): Promise<void> {
  for (const key of await store.keys()) await store.delete(key);
  for (const [key, value] of Object.entries(values)) await store.set(key, value);
}

/** The whole app state as one zip file. */
export async function saveAll(state: AppState): Promise<Uint8Array> {
  const assets = await entries(state.assets);
  const manifest: z.infer<typeof manifestSchema> = {
    format: 'virtuocity.backup',
    formatVersion: 1,
    settings: state.settings.read(),
    sessions: await entries(state.sessions),
    library: await entries(state.library),
    assets: Object.fromEntries(Object.entries(assets).map(([id, a]) => [id, a.mime])),
  };
  const files: Record<string, Uint8Array> = { [MANIFEST]: strToU8(JSON.stringify(manifest)) };
  for (const [id, asset] of Object.entries(assets)) files[ASSET_DIR + id] = asset.bytes;
  return zipSync(files);
}

/** A backup read from a zip file, checked and ready to replace the app state. */
export interface Backup {
  readonly manifest: z.infer<typeof manifestSchema>;
  readonly assets: Record<string, StoredAsset>;
}

/** Reads a backup zip; throws if it is not one. */
export function readBackup(zip: Uint8Array): Backup {
  const files = unzipSync(zip);
  const raw = files[MANIFEST];
  if (!raw) throw new Error('This is not a Virtuocity backup.');
  const manifest = manifestSchema.parse(JSON.parse(strFromU8(raw)));
  const assets: Record<string, StoredAsset> = {};
  for (const [id, mime] of Object.entries(manifest.assets)) {
    const bytes = files[ASSET_DIR + id];
    if (!bytes) throw new Error(`The backup is missing the asset ${id}.`);
    assets[id] = { mime, bytes };
  }
  return { manifest, assets };
}

/** Replaces the entire app state with a backup; nothing of the old state remains. */
export async function loadAll(state: AppState, backup: Backup): Promise<void> {
  await replaceStore(state.assets, backup.assets);
  await replaceStore(state.library, backup.manifest.library);
  await replaceStore(state.sessions, backup.manifest.sessions);
  state.settings.replace(backup.manifest.settings);
}
