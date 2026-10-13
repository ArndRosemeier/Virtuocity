import { z } from 'zod';
import type { Actor } from './actor';
import { freeName } from './actor-names';

const record = z.record(z.string(), z.unknown());

/**
 * Brings one stored item up to date. Older libraries kept a saved actor under
 * its own library id, apart from the actor's id; now the two are the same.
 */
export function migrateItem(key: string, value: unknown): unknown {
  const item = record.safeParse(value);
  if (!item.success || item.data.kind !== 'actor') return value;
  const actor = record.safeParse(item.data.actor);
  if (!actor.success || actor.data.id === key) return value;
  return { ...item.data, id: key, actor: { ...actor.data, id: key } };
}

/** Renames actors that share a name with an older one ("Wren", "Wren 2"), oldest first. */
export function uniqueNames(actors: readonly Actor[]): Actor[] {
  const taken: string[] = [];
  return actors.map((actor) => {
    const name = freeName(actor.personality.name, taken);
    taken.push(name);
    return name === actor.personality.name
      ? actor
      : { ...actor, personality: { ...actor.personality, name } };
  });
}
