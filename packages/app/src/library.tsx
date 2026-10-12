import { createContext, useContext, useEffect, useState } from 'react';
import type { Library, LibraryItem, SavedActor, SavedSetup } from '@virtuocity/core';

export const LibraryContext = createContext<Library | null>(null);

export function useLibrary(): Library {
  const library = useContext(LibraryContext);
  if (!library) throw new Error('useLibrary must be used inside the app');
  return library;
}

export interface LibraryItems {
  readonly actors: readonly SavedActor[];
  readonly setups: readonly SavedSetup[];
}

/** The library's items, reloaded after every change. */
export function useLibraryItems(): LibraryItems {
  const library = useLibrary();
  const [items, setItems] = useState<readonly LibraryItem[]>([]);
  useEffect(() => {
    let live = true;
    const load = () => void library.list().then((next) => live && setItems(next));
    load();
    const stop = library.subscribe(load);
    return () => {
      live = false;
      stop();
    };
  }, [library]);
  return {
    actors: items.filter((i): i is SavedActor => i.kind === 'actor'),
    setups: items.filter((i): i is SavedSetup => i.kind === 'setup'),
  };
}
