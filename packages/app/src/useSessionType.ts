import { createContext, useContext } from 'react';
import type { SessionTypeDescription } from '@virtuocity/contract-session-type';
import { sessionTypeContract } from '@virtuocity/contract-session-type';
import type { TypeState } from './sessionType';
import { sessionTypeOf } from './sessionType';
import type { PanelProps } from './types';
import { useAnswer } from './useParts';

const NONE: SessionTypeDescription = { roles: [], panels: [] };

/** Asks the session's type how the session looks, again whenever the session changes. */
export function useTypeState({ host, session }: PanelProps): TypeState {
  const actor = sessionTypeOf(session.actors, host.skills.list());
  const shown = useAnswer(
    session,
    () =>
      actor ? session.invoke(actor.id, sessionTypeContract, 'describe', {}) : Promise.resolve(NONE),
    actor ? `${actor.id} ${JSON.stringify(actor.settings ?? {})} ${actor.skillIds.join()}` : '',
  );
  if (!actor) return { kind: 'none' };
  if (!shown) return { kind: 'asking' };
  // A type that cannot describe itself shows every panel rather than none.
  if ('error' in shown) return { kind: 'none' };
  return { kind: 'described', actor, description: shown };
}

/** The open session's type, as the app asked it once for every slot and the guide. */
export const TypeStateContext = createContext<TypeState>({ kind: 'none' });

export const useSessionType = (): TypeState => useContext(TypeStateContext);
