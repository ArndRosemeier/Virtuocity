import { useState } from 'react';
import { spaceContract } from '@virtuocity/contract-space';
import type { Actor, OutputPart, SessionRuntime } from '@virtuocity/core';
import { runSafely } from './LibraryActors';
import { Stepper } from './Stepper';
import type { PanelProps } from './types';

/** A space with several items a person steps through, e.g. a gallery's pictures. */
export interface Browsable {
  readonly items: readonly OutputPart[];
  readonly current: number;
}

/** The items to step through, when a space holds more than one. */
export function browsable(shown: unknown): Browsable | undefined {
  if (typeof shown !== 'object' || shown === null || !('items' in shown)) return undefined;
  const { items, current } = shown as { items?: readonly OutputPart[]; current?: number };
  if (!items || items.length < 2) return undefined;
  return { items, current: current ?? items.length - 1 };
}

/** Steps a space to another of its items; the space shows it once the state moves. */
function useBrowse(session: SessionRuntime, actor: Actor) {
  const [busy, setBusy] = useState(false);
  const browse = (to: number) =>
    runSafely(async () => {
      setBusy(true);
      try {
        await session.invoke(actor.id, spaceContract, 'browse', { to });
      } finally {
        setBusy(false);
      }
    });
  return { busy, browse };
}

interface Browsing {
  readonly session: SessionRuntime;
  readonly actor: Actor;
  /** What the space answered with; only one with several items is browsed. */
  readonly shown: unknown;
}

/** "‹ 2/5 ›" in a space's header, when it holds several items. */
export function SpaceStepper({ session, actor, shown }: Browsing) {
  const { busy, browse } = useBrowse(session, actor);
  const steps = browsable(shown);
  if (!steps) return null;
  const { current, items } = steps;
  return <Stepper index={current} count={items.length} show={browse} busy={busy} noun="item" />;
}

/**
 * A full-screen gallery: the current item takes half the room, the others
 * line up as thumbnails beside it; clicking one makes it current.
 */
export function GalleryView({
  host,
  items,
  current,
  session,
  actor,
}: Pick<PanelProps, 'host'> & Browsable & Omit<Browsing, 'shown'>) {
  const { busy, browse } = useBrowse(session, actor);
  const shown = items[current];
  return (
    <div className="space-gallery">
      <div className="space-gallery__current">{shown && host.renderers.render(shown)}</div>
      <ul className="space-gallery__thumbs">
        {items.map((item, i) => (
          <li key={i}>
            <button
              type="button"
              className="space-gallery__thumb"
              aria-label={`Show item ${i + 1}`}
              aria-current={i === current}
              disabled={busy}
              onClick={() => browse(i)}
            >
              {host.renderers.render(item)}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
