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
}

/** A role in the session (GM, player, support...). Any actor can take any seat. */
export interface Seat extends Identified {
  readonly role: string;
  readonly actorId?: string;
}
