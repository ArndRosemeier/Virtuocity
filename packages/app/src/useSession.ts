import { useEffect, useMemo, useReducer } from 'react';
import { SessionRuntime } from '@virtuocity/core';
import type { AppHost } from './types';
import { TEXT_MODEL, readSetting } from './settings';

export const USER_ID = 'user';

/** One running session for the page, re-rendering on every session event. */
export function useSession(host: AppHost): SessionRuntime {
  const session = useMemo(() => {
    const runtime = new SessionRuntime({
      host,
      providerId: 'openrouter',
      directorId: 'least-recent',
      modelDefaults: () => ({ text: readSetting(TEXT_MODEL) }),
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
