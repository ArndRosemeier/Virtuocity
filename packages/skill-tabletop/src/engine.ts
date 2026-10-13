import type {
  CheckInput,
  CheckResult,
  DIFFICULTIES,
  Outcome,
  RANKS,
} from '@virtuocity/contract-tabletop';

export type Difficulty = (typeof DIFFICULTIES)[number];
export type Rank = (typeof RANKS)[number];

/** How one game system judges a check, given the d20 kept and the total. */
export interface GameSystem {
  readonly name: string;
  judge(natural: number, total: number, dc: number, attack: boolean): Outcome;
  difficulty(difficulty: Difficulty, level: number | undefined): number;
  proficiency(level: number, rank: Rank): number;
}

/** Rolls a check by `system`'s rules; `random` is like Math.random, injectable for tests. */
export function rollCheck(
  system: GameSystem,
  input: CheckInput,
  random: () => number,
): CheckResult {
  const d20 = () => Math.floor(random() * 20) + 1;
  const rolls = input.edge ? [d20(), d20()] : [d20()];
  const natural = input.edge === 'disadvantage' ? Math.min(...rolls) : Math.max(...rolls);
  const total = natural + input.bonus;
  if (input.dc === undefined) return { rolls, natural, total };
  const outcome = system.judge(natural, total, input.dc, input.attack ?? false);
  return { rolls, natural, total, dc: input.dc, outcome };
}
