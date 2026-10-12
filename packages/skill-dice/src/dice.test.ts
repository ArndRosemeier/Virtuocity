import { describe, expect, it } from 'vitest';
import { parseDice, roll } from './dice';

describe('dice', () => {
  it('parses notation', () => {
    expect(parseDice('2d6+3')).toEqual({ count: 2, sides: 6, modifier: 3 });
    expect(parseDice('d20')).toEqual({ count: 1, sides: 20, modifier: 0 });
    expect(() => parseDice('banana')).toThrow();
  });

  it('rolls with an injected random source', () => {
    const result = roll('2d6-1', () => 0.99);
    expect(result.rolls).toEqual([6, 6]);
    expect(result.total).toBe(11);
  });
});
