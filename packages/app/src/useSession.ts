import { useEffect, useMemo, useReducer } from 'react';
import type { Actor, AssetStore, KeyValueStore, Library, ResolveConflicts } from '@virtuocity/core';
import { SessionRuntime, headMoved, stateChanged } from '@virtuocity/core';
import type { AppHost } from './types';
import { readModelDefaults } from './settings';
import { ensureStoryView } from './storyView';
import { syncCast } from './library';
import { prepareLibrary } from './seed';

export const USER_ID = 'user';
/** The autosaved session; the app keeps one session for now. */
export const CURRENT_SESSION = 'current';
const AUTOSAVE_DELAY_MS = 400;

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

/** Deletes the session's contents and starts an empty one with the human and a story view. */
export async function clearSession(host: AppHost, session: SessionRuntime): Promise<void> {
  await session.workspace.load([], null);
  await ensureCast(host, session);
}

/** Where a session's actors live and how name clashes with them are settled. */
export interface Actors {
  readonly library: Library;
  readonly resolve: ResolveConflicts;
}

async function restore(
  host: AppHost,
  session: SessionRuntime,
  store: KeyValueStore<unknown>,
  { library, resolve }: Actors,
): Promise<void> {
  await prepareLibrary(library, host);
  const saved = await store.get(CURRENT_SESSION);
  if (saved !== undefined) {
    try {
      await session.load(saved);
    } catch (error) {
      console.error('Could not restore the saved session; starting fresh.', error);
    }
  }
  await syncCast(library, session, resolve);
  await ensureCast(host, session);
}

/** Saves the session shortly after every change to its state. */
function autosave(session: SessionRuntime, store: KeyValueStore<unknown>): () => void {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const schedule = () => {
    clearTimeout(timer);
    timer = setTimeout(() => void store.set(CURRENT_SESSION, session.save()), AUTOSAVE_DELAY_MS);
  };
  const offs = [session.bus.on(stateChanged, schedule), session.bus.on(headMoved, schedule)];
  return () => offs.forEach((off) => off());
}

/** One running session for the page, restored from storage and saved on every change. */
export function useSession(
  host: AppHost,
  store: KeyValueStore<unknown>,
  assets: AssetStore,
  actors: Actors,
): SessionRuntime {
  const session = useMemo(
    () =>
      new SessionRuntime({
        host,
        providerId: 'openrouter',
        directorId: 'least-recent',
        modelDefaults: () => readModelDefaults(host.modalities.list()),
        assets,
      }),
    [host, assets],
  );
  const [, refresh] = useReducer((n: number) => n + 1, 0);
  useEffect(() => session.bus.on('*', refresh), [session]);
  useEffect(() => {
    let stop = () => {};
    void restore(host, session, store, actors).then(() => (stop = autosave(session, store)));
    return () => stop();
  }, [host, session, store, actors]);
  return session;
}
