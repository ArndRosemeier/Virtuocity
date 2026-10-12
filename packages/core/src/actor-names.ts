import type { Actor } from './actor';

/**
 * An actor's name is its key in the library: two actors may not share one.
 * Names compare without case and surrounding or repeated spaces, so "Wren"
 * and " wren " are the same name.
 */
export function nameKey(name: string): string {
  return name.trim().replace(/\s+/g, ' ').toLowerCase();
}

export function sameName(a: string, b: string): boolean {
  return nameKey(a) === nameKey(b);
}

/** The name, or the first of "Name 2", "Name 3"... that is not taken. */
export function freeName(name: string, taken: readonly string[]): string {
  const keys = new Set(taken.map(nameKey));
  if (!keys.has(nameKey(name))) return name;
  for (let n = 2; ; n++) {
    const candidate = `${name.trim()} ${n}`;
    if (!keys.has(nameKey(candidate))) return candidate;
  }
}

function canonical(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonical);
  if (value === null || typeof value !== 'object') return value;
  const entries = Object.entries(value).filter(([, v]) => v !== undefined);
  return Object.fromEntries(
    entries.sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => [k, canonical(v)]),
  );
}

/** Whether two actors are the same apart from their ids. */
export function sameActor(a: Actor, b: Actor): boolean {
  return (
    JSON.stringify(canonical({ ...a, id: '' })) === JSON.stringify(canonical({ ...b, id: '' }))
  );
}
