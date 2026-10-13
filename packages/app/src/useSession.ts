import { useEffect, useMemo, useReducer } from 'react';
import type { Actor, AssetStore, KeyValueStore, Library, ResolveConflicts } from '@virtuocity/core';
import { SessionRuntime } from '@virtuocity/core';
import { SessionCatalog } from './sessions';
import { SessionSwitcher, typeDeps } from './switcher';
import type { AppHost } from './types';
import { readModelDefaults } from './settings';
import { ensureStoryView } from './storyView';
import { keepLibrary, syncCast } from './library';
import { prepareLibrary } from './seed';

export const USER_ID = 'user';

const user: Actor = {
  id: USER_ID,
  controller: 'human',
  personality: { name: 'You', description: '' },
  skillIds: [],
};

/** Makes sure the human and a story view are in the cast, e.g. after loading or starting fresh. */
export async function ensureCast(host: AppHost, session: SessionRuntime): Promise<void> {
  if (!session.actors.some((a) => a.id === USER_ID)) await session.join(user);
  await ensureStoryView(host, session);
}

/** Where a session's actors live and how name clashes with them are settled. */
export interface Actors {
  readonly library: Library;
  readonly resolve: ResolveConflicts;
}

/** A runtime set up the way the app runs sessions: it includes the library's actors by id. */
function createRuntime(host: AppHost, assets: AssetStore, library: Library): SessionRuntime {
  return new SessionRuntime({
    host,
    modelDefaults: () => readModelDefaults(host.modalities.list()),
    assets,
    actors: library.actor,
  });
}

/**
 * The page's one runtime and the switcher that loads stored sessions into it.
 * On start it opens the session that was open last; every change is saved.
 */
export function useSession(
  host: AppHost,
  store: KeyValueStore<unknown>,
  assets: AssetStore,
  { library, resolve }: Actors,
): { session: SessionRuntime; switcher: SessionSwitcher } {
  const session = useMemo(() => createRuntime(host, assets, library), [host, assets, library]);
  const switcher = useMemo(
    () =>
      new SessionSwitcher({
        runtime: session,
        catalog: new SessionCatalog(store, () => crypto.randomUUID()),
        prepare: async (runtime, fromFile) => {
          await syncCast(library, runtime, fromFile ? resolve : keepLibrary);
          await ensureCast(host, runtime);
        },
        scratch: () => createRuntime(host, assets, library),
        ...typeDeps(
          () => host.skills.list(),
          () => library.actors(),
        ),
      }),
    [host, session, store, assets, library, resolve],
  );
  const [, refresh] = useReducer((n: number) => n + 1, 0);
  useEffect(() => session.bus.on('*', refresh), [session]);
  // The session shows its library actors as the library has them, so it redraws when they change.
  useEffect(() => library.subscribe(refresh), [library]);
  useEffect(() => {
    let stop = () => {};
    void prepareLibrary(library, host)
      .then(() => switcher.restore())
      .then(() => (stop = switcher.autosave()));
    return () => stop();
  }, [host, library, switcher]);
  return { session, switcher };
}
