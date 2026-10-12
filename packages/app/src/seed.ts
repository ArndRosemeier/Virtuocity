import type { Library } from '@virtuocity/core';
import { defaultActors, sameName } from '@virtuocity/core';
import type { Setting } from './settings';
import { readSetting, writeSetting } from './settings';
import type { AppHost } from './types';

/** Set once the default actors were offered, so deleted ones never come back. */
export const SEEDED: Setting = { key: 'virtuocity.library.seeded', fallback: '' };

const prepared = new WeakMap<Library, Promise<void>>();

/**
 * Brings the library up to date and, on the very first start, adds the default
 * actors of the installed setups. They are ordinary actors: edit or delete them.
 * Runs once per library, however often it is asked for (e.g. by a remounted effect).
 */
export function prepareLibrary(library: Library, host: AppHost): Promise<void> {
  const running = prepared.get(library) ?? prepare(library, host);
  prepared.set(library, running);
  return running;
}

async function prepare(library: Library, host: AppHost): Promise<void> {
  await library.migrate();
  if (readSetting(SEEDED)) return;
  const taken = (await library.actors()).map((a) => a.personality.name);
  const defaults = defaultActors(host.blueprints.list(), host.skills.list(), () =>
    crypto.randomUUID(),
  );
  for (const actor of defaults) {
    if (!taken.some((name) => sameName(name, actor.personality.name))) {
      await library.saveActor(actor);
    }
  }
  writeSetting(SEEDED, '1');
}
