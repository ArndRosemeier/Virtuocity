import { z } from 'zod';
import type { Actor } from './actor';
import { actorSchema } from './cast';
import type { KeyValueStore } from './storage';

/** A copy of an actor to make a variation from, named so it is easy to tell apart. */
export function copyOfActor(actor: Actor, id: string): Actor {
  return {
    ...actor,
    id,
    personality: { ...actor.personality, name: `${actor.personality.name} (copy)` },
  };
}

/** An actor kept for reuse in any session. */
export interface SavedActor {
  readonly kind: 'actor';
  readonly id: string;
  readonly savedAt: number;
  readonly actor: Actor;
}

/** A whole cast kept for reuse, started like a blueprint. */
export interface SavedSetup {
  readonly kind: 'setup';
  readonly id: string;
  readonly savedAt: number;
  readonly name: string;
  readonly description: string;
  /** The blueprint the cast came from; its layout is used when starting. */
  readonly blueprintId?: string;
  readonly actors: readonly Actor[];
}

export type LibraryItem = SavedActor | SavedSetup;

const itemSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('actor'), id: z.string(), savedAt: z.number(), actor: actorSchema }),
  z.object({
    kind: z.literal('setup'),
    id: z.string(),
    savedAt: z.number(),
    name: z.string(),
    description: z.string(),
    blueprintId: z.string().optional(),
    actors: z.array(actorSchema),
  }),
]);

const fileSchema = z.object({
  format: z.literal('virtuocity.library'),
  formatVersion: z.literal(1),
  items: z.array(itemSchema),
});

export interface LibraryOptions {
  readonly newId?: () => string;
  readonly now?: () => number;
}

export interface SetupDraft {
  readonly name: string;
  readonly description: string;
  readonly blueprintId?: string | undefined;
  readonly actors: readonly Actor[];
}

/**
 * Actors and setups kept apart from any session, so they can be reused,
 * exported and shared. Items that fail validation are skipped, never thrown.
 */
export class Library {
  readonly #listeners = new Set<() => void>();
  readonly #newId: () => string;
  readonly #now: () => number;

  constructor(
    private readonly store: KeyValueStore<unknown>,
    options: LibraryOptions = {},
  ) {
    this.#newId = options.newId ?? (() => crypto.randomUUID());
    this.#now = options.now ?? Date.now;
  }

  /** Every valid item, newest first. */
  async list(): Promise<LibraryItem[]> {
    const items: LibraryItem[] = [];
    for (const key of await this.store.keys()) {
      const parsed = itemSchema.safeParse(await this.store.get(key));
      // Zod types optional fields as `T | undefined`; parsed data never holds an explicit undefined.
      if (parsed.success) items.push(parsed.data as LibraryItem);
    }
    return items.sort((a, b) => b.savedAt - a.savedAt);
  }

  saveActor(actor: Actor): Promise<SavedActor> {
    return this.#put({ kind: 'actor', id: this.#newId(), savedAt: this.#now(), actor });
  }

  /** Replaces a saved actor, keeping its library id. */
  updateActor(id: string, actor: Actor): Promise<SavedActor> {
    return this.#put({ kind: 'actor', id, savedAt: this.#now(), actor });
  }

  saveSetup(draft: SetupDraft): Promise<SavedSetup> {
    const { blueprintId, ...rest } = draft;
    const base = { kind: 'setup' as const, id: this.#newId(), savedAt: this.#now(), ...rest };
    return this.#put(blueprintId === undefined ? base : { ...base, blueprintId });
  }

  async remove(id: string): Promise<void> {
    await this.store.delete(id);
    this.#changed();
  }

  /** The whole library as one JSON text. */
  async exportText(): Promise<string> {
    return JSON.stringify({
      format: 'virtuocity.library',
      formatVersion: 1,
      items: await this.list(),
    });
  }

  /** Adds every item of an exported library; items with the same id are replaced. */
  async importText(text: string): Promise<number> {
    const parsed = fileSchema.safeParse(JSON.parse(text));
    if (!parsed.success) throw new Error(`Not a Virtuocity library: ${parsed.error.message}`);
    for (const item of parsed.data.items) await this.store.set(item.id, item);
    this.#changed();
    return parsed.data.items.length;
  }

  /** Calls `listener` after every change; returns a function that stops it. */
  subscribe(listener: () => void): () => void {
    this.#listeners.add(listener);
    return () => this.#listeners.delete(listener);
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
