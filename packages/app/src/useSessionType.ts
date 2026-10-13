import { createContext, useContext } from 'react';
import { sessionTypeOf } from '@virtuocity/core';
import type { TypeState } from './sessionType';
import type { PanelProps } from './types';

/**
 * How the session's type describes it, as the runtime last heard. The app
 * redraws on every session event, including the type's new descriptions.
 */
export function useTypeState({ host, session }: PanelProps): TypeState {
  if (!sessionTypeOf(session.actors, host.skills.list())) return { kind: 'none' };
  const described = session.sessionType();
  return described ? { kind: 'described', ...described } : { kind: 'asking' };
}

/** The open session's type, as the app read it once for every slot and the guide. */
export const TypeStateContext = createContext<TypeState>({ kind: 'none' });

export const useSessionType = (): TypeState => useContext(TypeStateContext);
