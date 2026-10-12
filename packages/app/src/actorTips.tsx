import { createContext, useContext } from 'react';
import type { Actor } from '@virtuocity/core';
import { actorTip } from './actorTip';
import type { PanelProps } from './types';

/** Tooltip text for an actor, or for the session actor with that id. */
export type ActorTips = (actor: Actor | string) => string | undefined;

export const ActorTipsContext = createContext<ActorTips>(() => undefined);

/** Describes actors through the installed skills, reading the session's actors when asked. */
export function actorTips({ host, session }: PanelProps): ActorTips {
  const skillName = (id: string) => host.skills.find(id)?.name;
  return (target) => {
    const actor = typeof target === 'string' ? session.actors.find((a) => a.id === target) : target;
    return actor && actorTip(actor, skillName);
  };
}

export const useActorTips = () => useContext(ActorTipsContext);
