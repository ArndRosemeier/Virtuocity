import { useEffect, useMemo, useReducer } from 'react';
import type { Actor, KeyValueStore } from '@virtuocity/core';
import { SessionRuntime, headMoved, stateChanged } from '@virtuocity/core';
import type { AppHost } from './types';
import { readModelDefaults } from './settings';

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

/** Makes sure the human is in the cast, e.g. after loading or starting fresh. */
export async function ensureUser(session: SessionRuntime): Promise<void> {
  if (!session.actors.some((a) => a.id === USER_ID)) await session.join(user);
}

async function restore(session: SessionRuntime, store: KeyValueStore<unknown>): Promise<void> {
  const saved = await store.get(CURRENT_SESSION);
  if (saved !== undefined) {
    try {
      await session.load(saved);
    } catch (error) {
      console.error('Could not restore the saved session; starting fresh.', error);
    }
  }
  await ensureUser(session);
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
export function useSession(host: AppHost, store: KeyValueStore<unknown>): SessionRuntime {
  const session = useMemo(
    () =>
      new SessionRuntime({
        host,
        providerId: 'openrouter',
        directorId: 'least-recent',
        modelDefaults: () => readModelDefaults(host.modalities.list()),
      }),
    [host],
  );
  const [, refresh] = useReducer((n: number) => n + 1, 0);
  useEffect(() => session.bus.on('*', refresh), [session]);
  useEffect(() => {
    let stop = () => {};
    void restore(session, store).then(() => (stop = autosave(session, store)));
    return () => stop();
  }, [session, store]);
  return session;
}
