import { createContext, useContext, useEffect, useState, useSyncExternalStore } from 'react';
import type { Actor, SessionRuntime } from '@virtuocity/core';
import type { Skill } from '@virtuocity/core';
import {
  everyone,
  headMoved,
  isSessionType,
  sessionTypeOf,
  startSession,
  stateChanged,
} from '@virtuocity/core';
import { listenerSet } from './listeners';
import type { SessionCatalog, SessionEntry } from './sessions';
import type { Setting } from './settings';
import { readSetting, writeSetting } from './settings';

/** The session that was open last, opened again on the next start. */
export const OPEN_SESSION: Setting = { key: 'virtuocity.openSession', fallback: '' };
/** What a session the app has to start on its own (first start, last one deleted) is called. */
export const FIRST_SESSION = 'Session';
const AUTOSAVE_DELAY_MS = 400;

type Load = (runtime: SessionRuntime) => Promise<void>;

export interface SwitcherDeps {
  /** The one runtime the page shows; switching loads another session into it. */
  readonly runtime: SessionRuntime;
  readonly catalog: SessionCatalog;
  /**
   * Brings a freshly loaded session's cast in line with the library and the app.
   * `fromFile` is set for a session loaded from a file: only its actors may
   * clash with the library. A stored session refers to library actors (one saved
   * by an older version may still hold copies; the library's version wins).
   */
  readonly prepare: (runtime: SessionRuntime, fromFile: boolean) => Promise<void>;
  /** A runtime that is never shown, for reading a stored session's cast. */
  readonly scratch: () => SessionRuntime;
  /** Whether the runtime's session has its session type; a session without one is not kept. */
  readonly typed: (runtime: SessionRuntime) => boolean;
  /** The session type a session the app starts on its own gets, if the library has one. */
  readonly firstType: () => Promise<Actor | undefined>;
}

/**
 * The switcher's session-type deps: a session is typed by an actor serving
 * session-type; one the app starts on its own gets the library's oldest type
 * (on a fresh start the first one offered, Open).
 */
export function typeDeps(
  skills: () => readonly Skill[],
  library: () => Promise<readonly Actor[]>,
): Pick<SwitcherDeps, 'typed' | 'firstType'> {
  return {
    typed: (runtime) => sessionTypeOf(runtime.actors, skills()) !== undefined,
    firstType: async () => (await library()).filter((a) => isSessionType(a, skills())).at(-1),
  };
}

/** A session loaded from a file that has no session type. */
export class UntypedSessionError extends Error {
  constructor() {
    super('This session has no session type (or cannot be read), so it cannot be opened.');
    this.name = 'UntypedSessionError';
  }
}

/**
 * Which stored session is open. The page has one runtime; opening a session
 * loads it there, and every change to it is saved back under its id.
 */
export class SessionSwitcher {
  readonly catalog: SessionCatalog;
  readonly #deps: SwitcherDeps;
  /** Unset while a session is being swapped in, so nothing is saved halfway. */
  #id: string | undefined;
  #timer: ReturnType<typeof setTimeout> | undefined;
  readonly #changes = listenerSet();

  constructor(deps: SwitcherDeps) {
    this.#deps = deps;
    this.catalog = deps.catalog;
  }

  get openId(): string | undefined {
    return this.#id;
  }

  readonly subscribe = (listener: () => void): (() => void) => this.#changes.subscribe(listener);

  /** Saves shortly after every change to the open session; returns a stop function. */
  autosave(): () => void {
    const { bus } = this.#deps.runtime;
    const schedule = () => {
      clearTimeout(this.#timer);
      this.#timer = setTimeout(() => void this.flush(), AUTOSAVE_DELAY_MS);
    };
    const offs = [bus.on(stateChanged, schedule), bus.on(headMoved, schedule)];
    return () => offs.forEach((off) => off());
  }

  /** Saves the open session now. */
  async flush(): Promise<void> {
    clearTimeout(this.#timer);
    if (this.#id) await this.catalog.saveState(this.#id, this.#deps.runtime.save());
  }

  /**
   * Opens the session that was open last, else the first one, else a new one
   * of the library's first session type. Sessions without a type (and ones
   * that cannot be read) are deleted on the way. With no session type at all,
   * nothing is kept open until the person makes one.
   */
  async restore(): Promise<void> {
    for (;;) {
      const entries = (await this.catalog.list()).filter((e) => !e.template);
      const next = entries.find((e) => e.id === readSetting(OPEN_SESSION)) ?? entries[0];
      if (!next) break;
      if (await this.#tryOpen(next.id)) return;
      await this.catalog.remove(next.id);
    }
    const type = await this.#deps.firstType();
    if (type) {
      const name = await this.catalog.freeName(FIRST_SESSION);
      await this.startNew(name, (runtime) => startSession(runtime, [type]));
    } else await this.#swap((runtime) => runtime.workspace.load([], null));
  }

  /** Opens a stored session. One that cannot be read or has no type is deleted, and another opens. */
  async open(id: string): Promise<void> {
    if (await this.#tryOpen(id)) return;
    await this.catalog.remove(id);
    await this.restore();
    throw new UntypedSessionError();
  }

  async #tryOpen(id: string): Promise<boolean> {
    const stored = await this.catalog.get(id);
    if (!stored) return false;
    let readable = true;
    await this.#swap(async (runtime) => {
      try {
        await runtime.load(stored.state);
      } catch (error) {
        console.error('Could not load the session.', error);
        readable = false;
      }
    });
    if (!readable || !this.#deps.typed(this.#deps.runtime)) return false;
    this.#show(id);
    return true;
  }

  /** Starts an empty session, which `fill` sets up with its session type. */
  async startNew(name: string, fill: Load = async () => {}) {
    await this.#startAs(name, async (runtime) => {
      await runtime.workspace.load([], null);
      await this.#deps.prepare(runtime, false);
      await fill(runtime);
    });
  }

  /** Starts a new session from a session loaded from a file; refuses one without a type. */
  async startFrom(name: string, state: unknown): Promise<void> {
    await this.#startAs(name, (runtime) => runtime.load(state), true);
  }

  /** Starts a new session from a copy of a stored one, e.g. a template. */
  async copy(id: string, name: string): Promise<void> {
    await this.flush();
    const stored = await this.catalog.get(id);
    if (stored) await this.#startAs(name, (runtime) => runtime.load(stored.state));
  }

  /** Deletes a session; when it was open, another one opens. */
  async remove(id: string): Promise<void> {
    await this.catalog.remove(id);
    if (id !== this.#id) return;
    this.#id = undefined;
    await this.restore();
  }

  /** Deletes the open session; another one opens. */
  async removeOpen(): Promise<void> {
    if (this.#id) await this.remove(this.#id);
  }

  /** Every stored session (templates too) that has this actor. */
  async sessionsWith(actorId: string): Promise<SessionEntry[]> {
    const using: SessionEntry[] = [];
    for (const entry of await this.catalog.list()) {
      if ((await this.actorsOf(entry)).some((a) => a.id === actorId)) using.push(entry);
    }
    return using;
  }

  /** The actors a stored session uses: everyone ever in it, on any branch, also those that left. */
  async actorsOf(entry: SessionEntry): Promise<readonly Actor[]> {
    if (entry.id === this.#id) return everyone(this.#deps.runtime);
    const stored = await this.catalog.get(entry.id);
    const scratch = this.#deps.scratch();
    try {
      await scratch.load(stored?.state);
    } catch {
      return [];
    }
    return everyone(scratch);
  }

  async #startAs(name: string, load: Load, fromFile = false): Promise<void> {
    await this.#swap(load, fromFile);
    if (!this.#deps.typed(this.#deps.runtime)) {
      await this.restore();
      throw new UntypedSessionError();
    }
    this.#show(await this.catalog.create(name, this.#deps.runtime.save()));
  }

  async #swap(load: Load, fromFile = false): Promise<void> {
    await this.flush();
    this.#id = undefined;
    await load(this.#deps.runtime);
    await this.#deps.prepare(this.#deps.runtime, fromFile);
  }

  #show(id: string): void {
    this.#id = id;
    writeSetting(OPEN_SESSION, id);
    this.#changes.notify();
  }
}

export const SwitcherContext = createContext<SessionSwitcher | null>(null);

export function useSwitcher(): SessionSwitcher {
  const switcher = useContext(SwitcherContext);
  if (!switcher) throw new Error('useSwitcher must be used inside the app');
  return switcher;
}

/** Every stored session, reloaded after each change, and which one is open. */
export function useSessions(): { entries: readonly SessionEntry[]; openId: string | undefined } {
  const switcher = useSwitcher();
  const openId = useSyncExternalStore(switcher.subscribe, () => switcher.openId);
  const [entries, setEntries] = useState<readonly SessionEntry[]>([]);
  useEffect(() => {
    let live = true;
    const load = () => void switcher.catalog.list().then((next) => live && setEntries(next));
    load();
    const stops = [switcher.catalog.subscribe(load), switcher.subscribe(load)];
    return () => {
      live = false;
      stops.forEach((stop) => stop());
    };
  }, [switcher]);
  return { entries, openId };
}
