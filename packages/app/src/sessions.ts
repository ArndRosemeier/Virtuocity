import type { KeyValueStore } from '@virtuocity/core';
import { freeName, sameName } from '@virtuocity/core';
import { listenerSet } from './listeners';

/** A stored session: its name, whether it is a template, and its saved state. */
export interface StoredSession {
  readonly name: string;
  readonly template: boolean;
  readonly state: unknown;
}

/** A session as the list shows it. */
export interface SessionEntry {
  readonly id: string;
  readonly name: string;
  readonly template: boolean;
}

/** The name a session saved before sessions had names gets. */
export const UNNAMED = 'My session';

function isStored(value: unknown): value is StoredSession {
  return (
    typeof value === 'object' &&
    value !== null &&
    'name' in value &&
    typeof value.name === 'string' &&
    'template' in value &&
    typeof value.template === 'boolean' &&
    'state' in value
  );
}

/** Reads what the store holds; a bare saved session from before names becomes "My session". */
export function readStored(value: unknown): StoredSession {
  return isStored(value) ? value : { name: UNNAMED, template: false, state: value };
}

/** Why a new session cannot have this name: empty, or another session's. */
export function sessionNameProblem(name: string, taken: readonly string[]): string | undefined {
  if (!name.trim()) return 'Every session needs a name.';
  const clash = taken.find((n) => sameName(n, name));
  return clash && `There is already a session called ${clash}.`;
}

/**
 * Every saved session, each under an id. Names are unique, so the list never
 * shows two sessions that look the same. Templates are sessions too; the app
 * starts new sessions from copies of them.
 */
export class SessionCatalog {
  readonly #store: KeyValueStore<unknown>;
  readonly #newId: () => string;
  readonly #changes = listenerSet();

  constructor(store: KeyValueStore<unknown>, newId: () => string) {
    this.#store = store;
    this.#newId = newId;
  }

  readonly subscribe = (listener: () => void): (() => void) => this.#changes.subscribe(listener);

  async get(id: string): Promise<StoredSession | undefined> {
    const value = await this.#store.get(id);
    return value === undefined ? undefined : readStored(value);
  }

  /** Every session, sorted by name. */
  async list(): Promise<SessionEntry[]> {
    const entries: SessionEntry[] = [];
    for (const id of await this.#store.keys()) {
      const stored = await this.get(id);
      if (stored) entries.push({ id, name: stored.name, template: stored.template });
    }
    return entries.sort((a, b) => a.name.localeCompare(b.name));
  }

  /** Adds a session and returns its id; throws if the name is empty or taken. */
  async create(name: string, state: unknown): Promise<string> {
    const problem = sessionNameProblem(
      name,
      (await this.list()).map((e) => e.name),
    );
    if (problem) throw new Error(problem);
    const id = this.#newId();
    await this.#store.set(id, { name: name.trim(), template: false, state });
    this.#changes.notify();
    return id;
  }

  /** A free name based on `name`, e.g. "Session 2" when "Session" is taken. */
  async freeName(name: string): Promise<string> {
    return freeName(
      name,
      (await this.list()).map((e) => e.name),
    );
  }

  /** Stores a session's latest state; its name and template flag stay. */
  async saveState(id: string, state: unknown): Promise<void> {
    const stored = await this.get(id);
    if (stored) await this.#store.set(id, { ...stored, state });
  }

  /** Gives a session another name; throws if it is empty or another session's. */
  async rename(id: string, name: string): Promise<void> {
    const stored = await this.get(id);
    if (!stored) return;
    const others = (await this.list()).filter((e) => e.id !== id).map((e) => e.name);
    const problem = sessionNameProblem(name, others);
    if (problem) throw new Error(problem);
    await this.#store.set(id, { ...stored, name: name.trim() });
    this.#changes.notify();
  }

  async setTemplate(id: string, template: boolean): Promise<void> {
    const stored = await this.get(id);
    if (!stored) return;
    await this.#store.set(id, { ...stored, template });
    this.#changes.notify();
  }

  async remove(id: string): Promise<void> {
    await this.#store.delete(id);
    this.#changes.notify();
  }
}
