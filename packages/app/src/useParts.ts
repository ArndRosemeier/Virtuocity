import { useEffect, useReducer, useRef, useState } from 'react';
import type { OutputPart, SessionRuntime } from '@virtuocity/core';
import { headMoved, stateChanged } from '@virtuocity/core';

/** What a view shows: output parts, or why it could not get them. */
export type Shown = { readonly parts: readonly OutputPart[] } | { readonly error: string };

/**
 * Output parts an actor provides through a contract (a space's contents, the
 * story view), asked for again whenever the session's state moves. The last
 * answer stays on screen until the next one arrives.
 */
export function useParts(
  session: SessionRuntime,
  ask: () => Promise<{ readonly parts: readonly OutputPart[] }>,
  key: string,
): Shown | undefined {
  const [shown, setShown] = useState<Shown>();
  // `ask` is rebuilt on every render; `key` says when it asks for something else.
  const latest = useRef(ask);
  latest.current = ask;
  const [version, bump] = useReducer((n: number) => n + 1, 0);
  useEffect(() => {
    const offs = [session.bus.on(stateChanged, bump), session.bus.on(headMoved, bump)];
    return () => offs.forEach((off) => off());
  }, [session]);
  useEffect(() => {
    let live = true;
    latest.current().then(
      ({ parts }) => live && setShown({ parts }),
      (error: unknown) => live && setShown({ error: String(error) }),
    );
    return () => {
      live = false;
    };
  }, [session, key, version]);
  return shown;
}
