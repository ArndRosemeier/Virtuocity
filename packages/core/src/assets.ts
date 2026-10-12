import type { KeyValueStore } from './storage';

/** Binary content (images, audio, models) kept out of the log; operations hold its id. */
export interface StoredAsset {
  readonly mime: string;
  readonly bytes: Uint8Array;
}

export interface AssetRef {
  /** `sha256-<hex>`: the same content always gets the same id. */
  readonly id: string;
  readonly mime: string;
  readonly size: number;
}

export interface AssetStore {
  put(bytes: Uint8Array, mime: string): Promise<AssetRef>;
  get(id: string): Promise<StoredAsset | undefined>;
}

const ASSET_ID = /^sha256-[0-9a-f]{64}$/;

export async function sha256(bytes: Uint8Array): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', bytes as Uint8Array<ArrayBuffer>);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** A content-addressed asset store on top of any key-value store. */
export function createAssetStore(
  store: KeyValueStore<StoredAsset>,
  hash: (bytes: Uint8Array) => Promise<string> = sha256,
): AssetStore {
  return {
    put: async (bytes, mime) => {
      const id = `sha256-${await hash(bytes)}`;
      if (!(await store.get(id))) await store.set(id, { mime, bytes });
      return { id, mime, size: bytes.byteLength };
    },
    get: (id) => store.get(id),
  };
}

/** Every asset id mentioned anywhere in a value, e.g. in operation payloads. */
export function findAssetIds(value: unknown, found = new Set<string>()): Set<string> {
  if (typeof value === 'string' && ASSET_ID.test(value)) found.add(value);
  else if (Array.isArray(value)) value.forEach((v) => findAssetIds(v, found));
  else if (value !== null && typeof value === 'object') {
    Object.values(value).forEach((v) => findAssetIds(v, found));
  }
  return found;
}
