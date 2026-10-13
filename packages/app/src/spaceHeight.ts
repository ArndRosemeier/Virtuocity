import type { Setting } from './settings';

/** Lowest a space gets, in pixels: its header and a little content. */
export const MIN_HEIGHT = 96;

/** A space's height in this browser, per actor, in pixels; empty means a third of the sidebar. */
export const spaceHeightSetting = (actorId: string): Setting => ({
  key: `virtuocity.spaceHeight.${actorId}`,
  fallback: '',
});

/** The height after dragging the space's bottom edge by `delta` pixels, at most the window's. */
export function movedHeight(start: number, delta: number, viewport: number): number {
  return Math.round(Math.min(Math.max(start + delta, MIN_HEIGHT), Math.max(MIN_HEIGHT, viewport)));
}

/** The CSS height for a stored value, or undefined for the default third. */
export function heightCss(stored: string): string | undefined {
  const px = Number(stored);
  if (stored === '' || !Number.isFinite(px) || px <= 0) return undefined;
  return `${Math.round(px)}px`;
}
