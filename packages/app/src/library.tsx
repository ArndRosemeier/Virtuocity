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
import { CAST, castDoc, includeKnownActors } from '@virtuocity/core';
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
 * Saves an actor in the library; every session that includes it has the change.
 * Refuses, saving nothing, when the change would give the open session a second director.
 */
export async function saveEverywhere(
  { host, library, session }: { host: AppHost; library: Library; session: SessionRuntime },
  actor: Actor,
): Promise<void> {
  if (session.actors.some((a) => a.id === actor.id)) assertCanJoin(host, session, actor);
  await library.saveActor(actor);
}

/**
 * Settles every clash for the library's version. Used for stored sessions: one
 * saved by an older version holds copies of its library actors, which may be
 * older than the library's, and that is no clash.
 */
export const keepLibrary: ResolveConflicts = () => Promise.resolve({});

/**
 * Moves the copies of actors a loaded session holds (a file, or a session saved
 * by an older version) into the library: new names join it, taken ones are
 * settled by `resolve`. The session then includes them from the library by id.
 */
export async function syncCast(
  library: Library,
  session: SessionRuntime,
  resolve: ResolveConflicts,
): Promise<void> {
  const { members } = session.workspace.read(CAST, castDoc);
  const copies = members.flatMap((m) => (m.actor && isLibraryActor(m.actor) ? [m.actor] : []));
  if (copies.length > 0) await library.adopt(copies, resolve);
  await includeKnownActors(session);
}

/** The names of a setup's actors that are still in the library. */
export const setupNames = (setup: SavedSetup, actors: readonly Actor[]) =>
  setup.actorIds.flatMap((id) => actors.find((a) => a.id === id)?.personality.name ?? []);
