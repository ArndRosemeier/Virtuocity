import type { DirectorCandidate } from '@virtuocity/contract-director';
import type { Message } from '@virtuocity/core';

/**
 * Takes turns: the AI in the cast who spoke least recently goes next (one who
 * never spoke goes first). Only people left means the turn goes back to them.
 */
export function leastRecent(
  candidates: readonly DirectorCandidate[],
  transcript: readonly Message[],
): DirectorCandidate | undefined {
  const lastSpoke = (c: DirectorCandidate) => transcript.findLastIndex((m) => m.actorId === c.id);
  const ai = candidates.filter((c) => !c.person);
  const [next] = [...ai].sort((a, b) => lastSpoke(a) - lastSpoke(b));
  return next ?? candidates[0];
}
