import { useEffect, useMemo, useReducer } from 'react';
import { SessionRuntime } from '@virtuocity/core';
import type { AppHost } from './types';
import { readModelDefaults } from './settings';

export const USER_ID = 'user';

/** One running session for the page, re-rendering on every session event. */
export function useSession(host: AppHost): SessionRuntime {
  const session = useMemo(() => {
    const runtime = new SessionRuntime({
      host,
      providerId: 'openrouter',
      directorId: 'least-recent',
      modelDefaults: () => readModelDefaults(host.modalities.list()),
    });
    void runtime.join({
      id: USER_ID,
      controller: 'human',
      personality: { name: 'You', description: '' },
      skillIds: [],
    });
    return runtime;
  }, [host]);
  const [, refresh] = useReducer((n: number) => n + 1, 0);
  useEffect(() => session.bus.on('*', refresh), [session]);
  return session;
}
