import { createContext, useContext, useEffect, useState } from 'react';
import type {
  Actor,
  Library,
  LibraryItem,
  ResolveConflicts,
  SavedActor,
  SavedSetup,
  SessionRuntime,
} from '@virtuocity/core';
import { sameActor } from '@virtuocity/core';
import { assertCanJoin } from './oneDirector';
import { STORY_VIEW } from './storyView';
import type { AppHost } from './types';

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

/** Actors that live in the library: every AI actor but the story view, which the app manages. */
export function isLibraryActor(actor: Actor): boolean {
  return actor.controller === 'ai' && actor.id !== STORY_VIEW;
}

/**
 * Saves an actor in the library and, if it is in the session, there too.
 * Refuses, saving nothing, when the change would give the session a second director.
 */
export async function saveEverywhere(
  { host, library, session }: { host: AppHost; library: Library; session: SessionRuntime },
  actor: Actor,
): Promise<void> {
  const inSession = session.actors.some((a) => a.id === actor.id);
  if (inSession) assertCanJoin(host, session, actor);
  await library.saveActor(actor);
  if (inSession) await session.join(actor);
}

/**
 * Settles every clash for the library's version. A stored session's actors are
 * library actors; the copy it was saved with may be older than the library's
 * (edited while another session was open), and that is no clash.
 */
export const keepLibrary: ResolveConflicts = () => Promise.resolve({});

/**
 * Makes every actor in the session a library actor, e.g. after loading a file:
 * new names join the library, taken ones are settled by `resolve`, and the
 * session gets the actors as the library holds them.
 */
export async function syncCast(
  library: Library,
  session: SessionRuntime,
  resolve: ResolveConflicts,
): Promise<void> {
  const cast = session.actors.filter(isLibraryActor);
  const held = await library.adopt(cast, resolve);
  for (const actor of held) {
    const current = cast.find((a) => a.id === actor.id);
    if (!current || !sameActor(current, actor)) await session.join(actor);
  }
}

/** The names of a setup's actors that are still in the library. */
export const setupNames = (setup: SavedSetup, actors: readonly Actor[]) =>
  setup.actorIds.flatMap((id) => actors.find((a) => a.id === id)?.personality.name ?? []);
