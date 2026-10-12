import { z } from 'zod';
import type { Actor } from './actor';
import { nameKey } from './actor-names';
import { actorSchema } from './cast';
import type { ResolveConflicts } from './library-import';
import { planImport, settle } from './library-import';
import { legacySetupSchema, migrateItem, setupBaseSchema, uniqueNames } from './library-migrate';
import type { KeyValueStore } from './storage';

/** An actor kept for reuse in any session; its library id is the actor's id. */
export interface SavedActor {
  readonly kind: 'actor';
  readonly id: string;
  readonly savedAt: number;
  readonly actor: Actor;
}

/** A cast kept for reuse: library actors started together, like a blueprint. */
export interface SavedSetup {
  readonly kind: 'setup';
  readonly id: string;
  readonly savedAt: number;
  readonly name: string;
  readonly description: string;
  /** The blueprint the cast came from; its layout and guide are used when starting. */
  readonly blueprintId?: string;
  readonly actorIds: readonly string[];
}

export type LibraryItem = SavedActor | SavedSetup;

export const libraryItemSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('actor'), id: z.string(), savedAt: z.number(), actor: actorSchema }),
  setupBaseSchema.extend({ actorIds: z.array(z.string()) }),
]);

const fileSchema = z.object({
  format: z.literal('virtuocity.library'),
  formatVersion: z.literal(2),
  items: z.array(libraryItemSchema),
});

/** Saving an actor under a name another actor already has. */
export class NameTakenError extends Error {
  constructor(readonly taken: string) {
    super(`There is already an actor called "${taken}" in the library.`);
    this.name = 'NameTakenError';
  }
}

export interface LibraryOptions {
  readonly newId?: () => string;
  readonly now?: () => number;
  /** Brings a stored or incoming actor up to date, e.g. with `upgradeActor`. */
  readonly upgrade?: (actor: Actor) => Actor;
}

export interface SetupDraft {
  readonly name: string;
  readonly description: string;
  readonly blueprintId?: string | undefined;
  readonly actorIds: readonly string[];
}

const isActor = (i: LibraryItem): i is SavedActor => i.kind === 'actor';
const isSetup = (i: LibraryItem): i is SavedSetup => i.kind === 'setup';

/**
 * The actors and setups you keep. Every actor in a session is one of these:
 * sessions refer to library actors by id, and names are unique. Items that
 * fail validation are skipped, never thrown.
 */
export class Library {
  readonly #listeners = new Set<() => void>();
  readonly #newId: () => string;
  readonly #now: () => number;
  readonly #upgrade: (actor: Actor) => Actor;

  constructor(
    private readonly store: KeyValueStore<unknown>,
    options: LibraryOptions = {},
  ) {
    this.#newId = options.newId ?? (() => crypto.randomUUID());
    this.#now = options.now ?? Date.now;
    this.#upgrade = options.upgrade ?? ((actor) => actor);
  }

  /** Every valid item, newest first. Items saved by older versions are brought up to date. */
  async list(): Promise<LibraryItem[]> {
    const items: LibraryItem[] = [];
    for (const key of await this.store.keys()) {
      const parsed = libraryItemSchema.safeParse(migrateItem(key, await this.store.get(key)));
      // Zod types optional fields as `T | undefined`; parsed data never holds an explicit undefined.
      if (parsed.success) items.push(parsed.data as LibraryItem);
    }
    return items.sort((a, b) => b.savedAt - a.savedAt);
  }

  async actors(): Promise<Actor[]> {
    return (await this.list()).filter(isActor).map((i) => i.actor);
  }

  /** Whether another actor than `exceptId` has this name. */
  async nameTaken(name: string, exceptId?: string): Promise<boolean> {
    const key = nameKey(name);
    return (await this.actors()).some(
      (a) => a.id !== exceptId && nameKey(a.personality.name) === key,
    );
  }

  /** Adds an actor, or replaces the one with its id. Throws `NameTakenError` for a taken name. */
  async saveActor(actor: Actor): Promise<SavedActor> {
    if (await this.nameTaken(actor.personality.name, actor.id)) {
      throw new NameTakenError(actor.personality.name.trim());
    }
    return this.#put({ kind: 'actor', id: actor.id, savedAt: this.#now(), actor });
  }

  saveSetup(draft: SetupDraft): Promise<SavedSetup> {
    const { blueprintId, ...rest } = draft;
    const base = { kind: 'setup' as const, id: this.#newId(), savedAt: this.#now(), ...rest };
    return this.#put(blueprintId === undefined ? base : { ...base, blueprintId });
  }

  /** Removes an item; a removed actor also leaves every setup. */
  async remove(id: string): Promise<void> {
    await this.store.delete(id);
    await this.#replaceInSetups(id, undefined);
    this.#changed();
  }

  /**
   * Makes the library hold these actors under their own ids, e.g. the cast of a
   * loaded session or an imported file. Names already taken by different actors
   * are settled by `resolve`. Returns the actors as the library now holds them.
   */
  async adopt(incoming: readonly Actor[], resolve: ResolveConflicts): Promise<Actor[]> {
    const steps = planImport(await this.actors(), incoming.map(this.#upgrade));
    const conflicts = steps.flatMap((s) => (s.type === 'conflict' ? [s] : []));
    const choices = conflicts.length > 0 ? await resolve(conflicts) : {};
    const result: Actor[] = [];
    for (const step of steps) {
      const actor = settle(step, step.type === 'conflict' ? choices[step.incoming.id] : undefined);
      const fromId =
        step.type === 'add' ? actor.id : step.type === 'link' ? step.fromId : step.existing.id;
      await this.#moveAside(actor.id, fromId);
      if (fromId !== actor.id) await this.#rekey(fromId, actor.id);
      await this.store.set(actor.id, { kind: 'actor', id: actor.id, savedAt: this.#now(), actor });
      result.push(actor);
    }
    if (steps.length > 0) this.#changed();
    return result;
  }

  /** Brings a library saved by an older version up to date: current skills, unique names, setups that refer to actors. */
  async migrate(): Promise<void> {
    const saved = (await this.list()).filter(isActor).sort((a, b) => a.savedAt - b.savedAt);
    const renamed = uniqueNames(saved.map((i) => this.#upgrade(i.actor)));
    for (const [i, item] of saved.entries()) {
      const actor = renamed[i];
      if (actor && actor !== item.actor) await this.store.set(item.id, { ...item, actor });
    }
    for (const key of await this.store.keys()) {
      const legacy = legacySetupSchema.safeParse(await this.store.get(key));
      if (!legacy.success) continue;
      const { actors, ...setup } = legacy.data;
      // Zod types optional fields as `T | undefined`; parsed data never holds an explicit undefined.
      const adopted = await this.adopt(actors as Actor[], () => Promise.resolve({}));
      await this.store.set(key, { ...setup, actorIds: adopted.map((a) => a.id) });
    }
    this.#changed();
  }

  /** The whole library as one JSON text. */
  async exportText(): Promise<string> {
    return JSON.stringify({
      format: 'virtuocity.library',
      formatVersion: 2,
      items: await this.list(),
    });
  }

  /** Adds an exported library: actors as `adopt` does, setups as they are. Returns the item count. */
  async importText(text: string, resolve: ResolveConflicts): Promise<number> {
    const parsed = fileSchema.safeParse(JSON.parse(text));
    if (!parsed.success) throw new Error(`Not a Virtuocity library: ${parsed.error.message}`);
    const items = parsed.data.items as LibraryItem[];
    await this.adopt(
      items.filter(isActor).map((i) => i.actor),
      resolve,
    );
    for (const setup of items.filter(isSetup)) await this.store.set(setup.id, setup);
    this.#changed();
    return items.length;
  }

  /** Calls `listener` after every change; returns a function that stops it. */
  subscribe(listener: () => void): () => void {
    this.#listeners.add(listener);
    return () => this.#listeners.delete(listener);
  }

  /** Gives an unrelated actor holding `id` a fresh id, so `id` is free for another. */
  async #moveAside(id: string, keepId: string): Promise<void> {
    if (id === keepId || (await this.store.get(id)) === undefined) return;
    await this.#rekey(id, this.#newId());
  }

  async #rekey(fromId: string, toId: string): Promise<void> {
    const item = (await this.list()).find((i) => i.id === fromId);
    if (!item || !isActor(item)) return;
    await this.store.delete(fromId);
    await this.store.set(toId, { ...item, id: toId, actor: { ...item.actor, id: toId } });
    await this.#replaceInSetups(fromId, toId);
  }

  async #replaceInSetups(fromId: string, toId: string | undefined): Promise<void> {
    for (const setup of (await this.list()).filter(isSetup)) {
      if (!setup.actorIds.includes(fromId)) continue;
      const actorIds = setup.actorIds.flatMap((id) => (id !== fromId ? [id] : toId ? [toId] : []));
      await this.store.set(setup.id, { ...setup, actorIds });
    }
  }

  async #put<T extends LibraryItem>(item: T): Promise<T> {
    await this.store.set(item.id, item);
    this.#changed();
    return item;
  }

  #changed(): void {
    for (const listener of this.#listeners) listener();
  }
}
