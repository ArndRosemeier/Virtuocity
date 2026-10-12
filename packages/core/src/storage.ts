/**
 * Where saved data lives. The core only talks to this interface; the app
 * injects a real one (IndexedDB in the browser), tests use `memoryStore`.
 */
export interface KeyValueStore<T> {
  get(key: string): Promise<T | undefined>;
  set(key: string, value: T): Promise<void>;
  delete(key: string): Promise<void>;
  keys(): Promise<string[]>;
}

export function memoryStore<T>(): KeyValueStore<T> {
  const items = new Map<string, T>();
  return {
    get: (key) => Promise.resolve(items.get(key)),
    set: (key, value) => Promise.resolve(void items.set(key, value)),
    delete: (key) => Promise.resolve(void items.delete(key)),
    keys: () => Promise.resolve([...items.keys()]),
  };
}
