import { useSyncExternalStore } from 'react';
import { listenerSet } from './listeners';

/**
 * Which on-demand spaces are open, e.g. a chronicler's summary after its
 * marker was clicked. Only what this screen shows; nothing in the session.
 */
let open: ReadonlySet<string> = new Set();
const changes = listenerSet();

function set(next: ReadonlySet<string>): void {
  open = next;
  changes.notify();
}

/** Opens an actor's space and brings it into view. */
export function openSpace(actorId: string): void {
  if (!open.has(actorId)) set(new Set([...open, actorId]));
  requestAnimationFrame(() => {
    const element = document.getElementById(spaceElementId(actorId));
    element?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    element?.animate([{ outlineColor: 'var(--accent)' }, { outlineColor: 'transparent' }], 1200);
  });
}

export function closeSpace(actorId: string): void {
  set(new Set([...open].filter((id) => id !== actorId)));
}

export function useOpenSpaces(): ReadonlySet<string> {
  return useSyncExternalStore(changes.subscribe, () => open);
}

export const spaceElementId = (actorId: string) => `space-${actorId}`;
