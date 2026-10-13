import type { ModelOverrides } from './models';
import type { Identified } from './registry';

export interface Personality {
  readonly name: string;
  /** Free-form description fed to LLM skills: voice, backstory, quirks. */
  readonly description: string;
}

/**
 * Anyone in a session, human or AI. What an actor can do comes entirely
 * from its skills; an actor without a turn-taking skill is silent.
 */
export interface Actor extends Identified {
  readonly controller: 'human' | 'ai';
  readonly personality: Personality;
  readonly skillIds: readonly string[];
  readonly models?: ModelOverrides;
  /** Per-skill settings, keyed by skill id; read them with `readSettings`. */
  readonly settings?: Readonly<Record<string, unknown>>;
  /** Profile fields contributed by modules, keyed by field id. */
  readonly profile?: Readonly<Record<string, unknown>>;
}

declare const LIBRARY: unique symbol;

/**
 * An actor as the library holds it. Its name is its identity: there is one of
 * it, kept only in the library, and everything else refers to it by id. The
 * mark exists only for the type checker, so a library actor can never be
 * stored as a session's own actor (`OwnActor`) by mistake.
 */
export type LibraryActor = Actor & { readonly [LIBRARY]: true };

/** An actor a session owns and keeps itself, e.g. the person or the story view; never a library actor. */
export type OwnActor = Actor & { readonly [LIBRARY]?: never };
