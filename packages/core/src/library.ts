import { z } from 'zod';
import type { Actor, LibraryActor } from './actor';
import { nameKey } from './actor-names';
import { actorSchema } from './cast';
import type { ResolveConflicts } from './library-import';
import { planImport, settle } from './library-import';
import { migrateItem, uniqueNames } from './library-migrate';
import type { KeyValueStore } from './storage';

/** An actor kept for reuse in any session; its library id is the actor's id. */
export interface SavedActor {
  readonly kind: 'actor';
  readonly id: string;
  readonly savedAt: number;
  readonly actor: LibraryActor;
}

/** What the library keeps: actors only (saved setups were dropped for session types and templates). */
export type LibraryItem = SavedActor;

export const libraryItemSchema = z.object({
  kind: z.literal('actor'),
  id: z.string(),
  savedAt: z.number(),
  actor: actorSchema,
});

/** Older files may still list setups; they are skipped. */
const fileSchema = z.object({
  format: z.literal('virtuocity.library'),
  formatVersion: z.literal(2),
  items: z.array(z.unknown()),
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

/** Marks an actor as the library's own; only the library does this. */
const held = (actor: Actor) => actor as LibraryActor;

/**
 * The actors you keep. Every actor in a session is one of these:
 * sessions refer to library actors by id, and names are unique. Items that
 * fail validation are skipped, never thrown.
 */
export class Library {
  readonly #listeners = new Set<() => void>();
  readonly #newId: () => string;
  readonly #now: () => number;
  readonly #upgrade: (actor: Actor) => Actor;
  /** Every actor as of the last change or `load`, for looking actors up without waiting. */
  #known = new Map<string, LibraryActor>();

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
      if (parsed.success) items.push({ ...parsed.data, actor: held(parsed.data.actor as Actor) });
    }
    return items.sort((a, b) => b.savedAt - a.savedAt);
  }

  /**
   * The actor with this id, right away, as of the last change or `load`. Sessions
   * look their library actors up with it (see `SessionConfig.actors`).
   */
  readonly actor = (id: string): LibraryActor | undefined => this.#known.get(id);

  /** Reads the stored actors so `actor` finds them, e.g. on start. */
  load(): Promise<void> {
    return this.#changed();
  }

  async actors(): Promise<LibraryActor[]> {
    return (await this.list()).map((i) => i.actor);
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
    return this.#put({ kind: 'actor', id: actor.id, savedAt: this.#now(), actor: held(actor) });
  }

  /** Removes an actor. */
  async remove(id: string): Promise<void> {
    await this.store.delete(id);
    await this.#changed();
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
    if (steps.length > 0) await this.#changed();
    return result;
  }

  /** Brings a library saved by an older version up to date: current skills, unique names, no setups. */
  async migrate(): Promise<void> {
    const saved = (await this.list()).sort((a, b) => a.savedAt - b.savedAt);
    const renamed = uniqueNames(saved.map((i) => this.#upgrade(i.actor)));
    for (const [i, item] of saved.entries()) {
      const actor = renamed[i];
      if (actor && actor !== item.actor) await this.store.set(item.id, { ...item, actor });
    }
    for (const key of await this.store.keys()) {
      const item = migrateItem(key, await this.store.get(key));
      if (!libraryItemSchema.safeParse(item).success) await this.store.delete(key);
    }
    await this.#changed();
  }

  /** The whole library as one JSON text. */
  async exportText(): Promise<string> {
    return JSON.stringify({
      format: 'virtuocity.library',
      formatVersion: 2,
      items: await this.list(),
    });
  }

  /** Adds the actors of an exported library as `adopt` does. Returns how many there were. */
  async importText(text: string, resolve: ResolveConflicts): Promise<number> {
    const parsed = fileSchema.safeParse(JSON.parse(text));
    if (!parsed.success) throw new Error(`Not a Virtuocity library: ${parsed.error.message}`);
    const actors = parsed.data.items.flatMap((item) => {
      const valid = libraryItemSchema.safeParse(item);
      // Zod types optional fields as `T | undefined`; parsed data never holds an explicit undefined.
      return valid.success ? [valid.data.actor as Actor] : [];
    });
    await this.adopt(actors, resolve);
    await this.#changed();
    return actors.length;
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
    if (!item) return;
    await this.store.delete(fromId);
    await this.store.set(toId, { ...item, id: toId, actor: { ...item.actor, id: toId } });
  }

  async #put<T extends LibraryItem>(item: T): Promise<T> {
    await this.store.set(item.id, item);
    await this.#changed();
    return item;
  }

  async #changed(): Promise<void> {
    this.#known = new Map((await this.actors()).map((a) => [a.id, a]));
    for (const listener of this.#listeners) listener();
  }
}
