import type { Actor } from './actor';
import type { Message } from './transcript';

/** What the human chose when the session paused after a turn. */
export type TurnChoice =
  | { readonly kind: 'act' }
  | { readonly kind: 'pass' }
  | { readonly kind: 'choose'; readonly actorId: string };

export interface DirectorInput {
  /** Actors that can currently take a turn (have a turn-taking skill). */
  readonly candidates: readonly Actor[];
  /** The story so far, as the director may see it. */
  readonly transcript: readonly Message[];
}

/** Picks who speaks next when the human passes. Swappable like everything else. */
export interface Director {
  readonly id: string;
  pickNext(input: DirectorInput): Promise<Actor | undefined>;
}

/** Default director: the AI actor who spoke least recently. */
export const leastRecentDirector: Director = {
  id: 'least-recent',
  pickNext: ({ candidates, transcript }) => {
    const ai = candidates.filter((a) => a.controller === 'ai');
    const lastSpoke = (a: Actor) => transcript.findLastIndex((m) => m.actorId === a.id);
    const sorted = [...ai].sort((a, b) => lastSpoke(a) - lastSpoke(b));
    return Promise.resolve(sorted[0]);
  },
};
