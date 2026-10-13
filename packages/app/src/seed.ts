import type { Library } from '@virtuocity/core';
import { castStarter, sameName } from '@virtuocity/core';
import type { Setting } from './settings';
import { readSetting, writeSetting } from './settings';
import type { AppHost } from './types';

/**
 * The ids of the starters already offered, so deleted actors never come back
 * while starters added by a newer version are still offered once.
 */
export const OFFERED: Setting = { key: 'virtuocity.library.offered', fallback: '' };

const prepared = new WeakMap<Library, Promise<void>>();

/**
 * Brings the library up to date and offers the starter actors of the installed
 * modules (session types such as Roleplay, and their usual cast) that were
 * never offered. They are ordinary actors: edit or delete them. Runs once per
 * library, however often it is asked for (e.g. by a remounted effect).
 */
export function prepareLibrary(library: Library, host: AppHost): Promise<void> {
  const running = prepared.get(library) ?? prepare(library, host);
  prepared.set(library, running);
  return running;
}

async function prepare(library: Library, host: AppHost): Promise<void> {
  await library.migrate();
  const offered = readSetting(OFFERED).split(' ').filter(Boolean);
  const skills = host.skills.list();
  for (const starter of host.starters.list()) {
    if (offered.includes(starter.id)) continue;
    const actor = castStarter(starter, skills);
    const taken = (await library.actors()).some((a) =>
      sameName(a.personality.name, starter.personality.name),
    );
    if (actor && !taken) await library.saveActor({ ...actor, id: crypto.randomUUID() });
    offered.push(starter.id);
  }
  writeSetting(OFFERED, offered.join(' '));
}

/** What `restoreStarters` did: library actors set back to the defaults, and ones added again. */
export interface Restored {
  readonly updated: readonly string[];
  readonly added: readonly string[];
}

/**
 * Sets every ready-made actor back to how this version ships it: a library
 * actor with a starter's name is overwritten in place (it stays the same
 * actor, so every session using it changes too), a missing one is added.
 * Changes made to them by hand are lost.
 */
export async function restoreStarters(library: Library, host: AppHost): Promise<Restored> {
  const skills = host.skills.list();
  const updated: string[] = [];
  const added: string[] = [];
  for (const starter of host.starters.list()) {
    const actor = castStarter(starter, skills);
    if (!actor) continue;
    const name = actor.personality.name;
    const existing = (await library.actors()).find((a) => sameName(a.personality.name, name));
    await library.saveActor({ ...actor, id: existing?.id ?? crypto.randomUUID() });
    (existing ? updated : added).push(name);
  }
  return { updated, added };
}
