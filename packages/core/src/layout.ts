import type { Identified } from './registry';

/**
 * The contributions a slot shows when a session shows these panels, in their
 * order. Showing no panels in particular (`undefined` or empty) shows all.
 */
export function arrangeSlot<T extends Identified & { readonly slot: string }>(
  items: readonly T[],
  slot: string,
  panels?: readonly string[],
): T[] {
  const inSlot = items.filter((i) => i.slot === slot);
  if (!panels || panels.length === 0) return inSlot;
  return panels.flatMap((id) => inSlot.filter((i) => i.id === id));
}
