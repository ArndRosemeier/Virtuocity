/** Parsed dice notation such as `2d6+3`. */
export interface DiceSpec {
  readonly count: number;
  readonly sides: number;
  readonly modifier: number;
}

export interface DiceRoll {
  readonly notation: string;
  readonly rolls: readonly number[];
  readonly modifier: number;
  readonly total: number;
}

const NOTATION = /^(\d*)d(\d+)([+-]\d+)?$/i;

export function parseDice(notation: string): DiceSpec {
  const match = NOTATION.exec(notation.replace(/\s+/g, ''));
  if (!match) throw new Error(`Invalid dice notation "${notation}"`);
  const [, count = '', sides = '', modifier = '0'] = match;
  const spec = {
    count: count === '' ? 1 : Number(count),
    sides: Number(sides),
    modifier: Number(modifier),
  };
  if (spec.count < 1 || spec.sides < 2) throw new Error(`Invalid dice notation "${notation}"`);
  return spec;
}

/** `random` returns a float in [0, 1), like Math.random; injectable for tests. */
export function roll(notation: string, random: () => number = Math.random): DiceRoll {
  const spec = parseDice(notation);
  const rolls = Array.from({ length: spec.count }, () => Math.floor(random() * spec.sides) + 1);
  const total = rolls.reduce((sum, r) => sum + r, spec.modifier);
  return { notation, rolls, modifier: spec.modifier, total };
}
