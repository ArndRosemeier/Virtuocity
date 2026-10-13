import type { Difficulty, GameSystem } from './engine';

const DCS: Record<Difficulty, number> = {
  'very easy': 5,
  easy: 10,
  standard: 15,
  hard: 20,
  'very hard': 25,
  extreme: 30,
};

/** D&D 5th edition, 2014 rules: meet the DC; natural 20 and 1 count only on attacks. */
export const dnd5e: GameSystem = {
  name: 'D&D 5th edition (2014 rules)',
  judge(natural, total, dc, attack) {
    if (attack && natural === 20) return 'critical success';
    if (attack && natural === 1) return 'critical failure';
    return total >= dc ? 'success' : 'failure';
  },
  difficulty: (difficulty) => DCS[difficulty],
  proficiency(level, rank) {
    if (rank === 'untrained') return 0;
    const bonus = 2 + Math.floor((level - 1) / 4);
    return rank === 'trained' ? bonus : bonus * 2;
  },
};
