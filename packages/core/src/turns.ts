import type { Actor } from './actor';
import type { MessageTree } from './session';

/** What the human chose when the session paused after a turn. */
export type TurnChoice =
  | { readonly kind: 'act' }
  | { readonly kind: 'pass' }
  | { readonly kind: 'choose'; readonly actorId: string };

export interface DirectorInput {
  /** Actors that can currently take a turn (have a turn-taking skill). */
  readonly candidates: readonly Actor[];
  readonly messages: MessageTree;
}

/** Picks who speaks next when the human passes. Swappable like everything else. */
export interface Director {
  readonly id: string;
  pickNext(input: DirectorInput): Promise<Actor | undefined>;
}

/** Default director: the AI actor who spoke least recently. */
export const leastRecentDirector: Director = {
  id: 'least-recent',
  pickNext: ({ candidates, messages }) => {
    const ai = candidates.filter((a) => a.controller === 'ai');
    const path = messages.activePath();
    const lastSpoke = (a: Actor) => path.findLastIndex((m) => m.actorId === a.id);
    const sorted = [...ai].sort((a, b) => lastSpoke(a) - lastSpoke(b));
    return Promise.resolve(sorted[0]);
  },
};
