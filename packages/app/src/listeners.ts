/** Callbacks to tell about a change, in the shape `useSyncExternalStore` subscribes with. */
export function listenerSet() {
  const listeners = new Set<() => void>();
  return {
    subscribe(listener: () => void): () => void {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    notify(): void {
      listeners.forEach((listener) => listener());
    },
  };
}
