import type { Setting } from './settings';

/** Narrowest a sidebar gets, in pixels. */
export const MIN_WIDTH = 224;
/** Widest a sidebar gets, as a share of the window. */
export const MAX_SHARE = 0.45;

/** A sidebar's width in this browser, in pixels; empty means the default. */
export const sidebarSetting = (slot: string): Setting => ({
  key: `virtuocity.sidebar.${slot}`,
  fallback: '',
});

export function clampWidth(px: number, viewport: number): number {
  const max = Math.max(MIN_WIDTH, viewport * MAX_SHARE);
  return Math.round(Math.min(Math.max(px, MIN_WIDTH), max));
}

/**
 * The width after moving the sidebar's inner edge by `delta` pixels to the
 * right. The left sidebar grows when its edge moves right, the others shrink.
 */
export function movedWidth(slot: string, start: number, delta: number, viewport: number): number {
  return clampWidth(start + (slot === 'left' ? delta : -delta), viewport);
}

/** The CSS width for a stored value, or undefined for the default. */
export function widthCss(stored: string): string | undefined {
  const px = Number(stored);
  if (stored === '' || !Number.isFinite(px) || px <= 0) return undefined;
  return `min(${Math.round(px)}px, ${MAX_SHARE * 100}vw)`;
}
