/** Anything that can be registered must carry a unique, stable id. */
export interface Identified {
  readonly id: string;
}

/**
 * A typed collection of plugins. Every extension point in Virtuocity
 * (skills, game modes, renderers, panels, providers) is a Registry.
 */
export class Registry<T extends Identified> {
  readonly #items = new Map<string, T>();

  constructor(readonly kind: string) {}

  register(item: T): void {
    if (this.#items.has(item.id)) {
      throw new Error(`${this.kind} "${item.id}" is already registered`);
    }
    this.#items.set(item.id, item);
  }

  /** Replaces an existing entry, e.g. to swap a default renderer. */
  replace(item: T): void {
    this.#items.set(item.id, item);
  }

  get(id: string): T {
    const item = this.#items.get(id);
    if (!item) throw new Error(`Unknown ${this.kind} "${id}"`);
    return item;
  }

  find(id: string): T | undefined {
    return this.#items.get(id);
  }

  list(): T[] {
    return [...this.#items.values()];
  }
}
