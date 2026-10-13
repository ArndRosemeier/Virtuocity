import { z } from 'zod';
import type { AssetStore } from './assets';
import { findAssetIds } from './assets';
import { encodeBase64 } from './media';
import type { SavedSession } from './persistence';
import { parseSavedSession } from './persistence';

/** One self-contained file: a saved session plus every asset it refers to. */
export interface SessionBundle {
  readonly format: 'virtuocity.bundle';
  readonly formatVersion: 1;
  readonly session: SavedSession;
  readonly assets: Readonly<Record<string, { readonly mime: string; readonly base64: string }>>;
}

const bundleShape = z.object({
  format: z.literal('virtuocity.bundle'),
  formatVersion: z.literal(1),
  session: z.unknown(),
  assets: z.record(z.string(), z.object({ mime: z.string(), base64: z.string() })),
});

const fromBase64 = (text: string) => Uint8Array.from(atob(text), (c) => c.charCodeAt(0));

/** Serializes a session and its assets into one JSON text, e.g. for "save all to file". */
export async function exportBundle(session: SavedSession, assets: AssetStore): Promise<string> {
  const entries: [string, { mime: string; base64: string }][] = [];
  for (const id of findAssetIds(session.operations.map((op) => op.payload))) {
    const asset = await assets.get(id);
    if (asset) entries.push([id, { mime: asset.mime, base64: encodeBase64(asset.bytes) }]);
  }
  const bundle: SessionBundle = {
    format: 'virtuocity.bundle',
    formatVersion: 1,
    session,
    assets: Object.fromEntries(entries),
  };
  return JSON.stringify(bundle);
}

/** Reads a bundle, stores its assets and returns the session ready for `runtime.load`. */
export async function importBundle(text: string, assets: AssetStore): Promise<SavedSession> {
  const parsed = bundleShape.safeParse(JSON.parse(text));
  if (!parsed.success) throw new Error(`Not a Virtuocity file: ${parsed.error.message}`);
  const session = parseSavedSession(parsed.data.session);
  for (const [id, asset] of Object.entries(parsed.data.assets)) {
    const stored = await assets.put(fromBase64(asset.base64), asset.mime);
    if (stored.id !== id) throw new Error(`Asset "${id}" does not match its content`);
  }
  return session;
}
