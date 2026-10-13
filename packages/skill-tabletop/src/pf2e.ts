import { OUTCOMES } from '@virtuocity/contract-tabletop';
import type { Outcome } from '@virtuocity/contract-tabletop';
import type { Difficulty, GameSystem, Rank } from './engine';

/** DCs by level, 0 to 25 (Pathfinder 2e, GM Core). */
const LEVEL_DCS = [
  14, 15, 16, 18, 19, 20, 22, 23, 24, 26, 27, 28, 30, 31, 32, 34, 35, 36, 38, 39, 40, 42, 44, 46,
  48, 50,
];

const ADJUSTMENT: Record<Difficulty, number> = {
  'very easy': -5,
  easy: -2,
  standard: 0,
  hard: 2,
  'very hard': 5,
  extreme: 10,
};

const TRAINING: Record<Rank, number> = {
  untrained: 0,
  trained: 2,
  expert: 4,
  master: 6,
  legendary: 8,
};

/** One degree better (`by` 1) or worse (-1), within the four degrees. */
const shift = (outcome: Outcome, by: number): Outcome =>
  OUTCOMES[Math.min(3, Math.max(0, OUTCOMES.indexOf(outcome) - by))] ?? outcome;

/** Pathfinder Second Edition: four degrees of success. */
export const pf2e: GameSystem = {
  name: 'Pathfinder Second Edition',
  judge(natural, total, dc) {
    const degree: Outcome =
      total >= dc + 10
        ? 'critical success'
        : total >= dc
          ? 'success'
          : total <= dc - 10
            ? 'critical failure'
            : 'failure';
    if (natural === 20) return shift(degree, 1);
    return natural === 1 ? shift(degree, -1) : degree;
  },
  difficulty: (difficulty, level) =>
    (level === undefined ? 15 : (LEVEL_DCS[level] ?? 50)) + ADJUSTMENT[difficulty],
  proficiency: (level, rank) => (rank === 'untrained' ? 0 : level + TRAINING[rank]),
};
