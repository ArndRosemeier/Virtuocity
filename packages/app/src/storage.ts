import type { KeyValueStore } from '@virtuocity/core';

const DB_NAME = 'virtuocity';
const STORES = ['sessions', 'assets'] as const;
export type StoreName = (typeof STORES)[number];

let db: Promise<IDBDatabase> | undefined;

function open(): Promise<IDBDatabase> {
  db ??= new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      for (const name of STORES) request.result.createObjectStore(name);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Could not open storage'));
  });
  return db;
}

async function run<R>(
  store: StoreName,
  mode: IDBTransactionMode,
  action: (s: IDBObjectStore) => IDBRequest<R>,
): Promise<R> {
  const database = await open();
  return new Promise((resolve, reject) => {
    const request = action(database.transaction(store, mode).objectStore(store));
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Storage request failed'));
  });
}

/** The browser's IndexedDB as a core `KeyValueStore`. */
export function indexedDbStore<T>(store: StoreName): KeyValueStore<T> {
  return {
    get: (key) => run(store, 'readonly', (s) => s.get(key) as IDBRequest<T | undefined>),
    set: async (key, value) => void (await run(store, 'readwrite', (s) => s.put(value, key))),
    delete: async (key) => void (await run(store, 'readwrite', (s) => s.delete(key))),
    keys: async () => (await run(store, 'readonly', (s) => s.getAllKeys())).map((k) => String(k)),
  };
}
