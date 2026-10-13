import { useSyncExternalStore } from 'react';
import { listenerSet } from './listeners';

/**
 * Which spaces a person opened or closed on this screen: on-demand ones (e.g.
 * a chronicler's summary) stay hidden until opened, every other one shows
 * until closed. Only what this screen shows; nothing in the session.
 */
export interface Toggled {
  readonly open: ReadonlySet<string>;
  readonly closed: ReadonlySet<string>;
}

let toggled: Toggled = { open: new Set(), closed: new Set() };
const changes = listenerSet();

const without = (ids: ReadonlySet<string>, id: string) =>
  new Set([...ids].filter((other) => other !== id));

function set(next: Toggled): void {
  toggled = next;
  changes.notify();
}

/** Opens an actor's space and brings it into view. */
export function openSpace(actorId: string): void {
  set({ open: new Set([...toggled.open, actorId]), closed: without(toggled.closed, actorId) });
  requestAnimationFrame(() => {
    const element = document.getElementById(spaceElementId(actorId));
    element?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    element?.animate([{ outlineColor: 'var(--accent)' }, { outlineColor: 'transparent' }], 1200);
  });
}

export function closeSpace(actorId: string): void {
  set({ open: without(toggled.open, actorId), closed: new Set([...toggled.closed, actorId]) });
}

/** Whether a space shows: on-demand ones once opened, the others until closed. */
export const isShown = (state: Toggled, actorId: string, onDemand: boolean) =>
  onDemand ? state.open.has(actorId) : !state.closed.has(actorId);

export function useOpenSpaces(): Toggled {
  return useSyncExternalStore(changes.subscribe, () => toggled);
}

export const spaceElementId = (actorId: string) => `space-${actorId}`;
