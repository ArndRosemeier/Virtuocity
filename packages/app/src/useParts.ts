import { useEffect, useReducer, useRef, useState } from 'react';
import type { OutputPart, SessionRuntime } from '@virtuocity/core';
import { headMoved, stateChanged } from '@virtuocity/core';

/** Output parts, plus whatever else the contract answers with. */
type Answer = { readonly parts: readonly OutputPart[] };

/** What a view shows: the contract's answer, or why it could not get one. */
export type Shown<T extends Answer = Answer> = T | { readonly error: string };

/**
 * Output parts an actor provides through a contract (a space's contents, the
 * story view), asked for again whenever the session's state moves. The last
 * answer stays on screen until the next one arrives.
 */
export function useParts<T extends Answer>(
  session: SessionRuntime,
  ask: () => Promise<T>,
  key: string,
): Shown<T> | undefined {
  const [shown, setShown] = useState<Shown<T>>();
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
      (answer) => live && setShown(answer),
      (error: unknown) => live && setShown({ error: String(error) }),
    );
    return () => {
      live = false;
    };
  }, [session, key, version]);
  return shown;
}
