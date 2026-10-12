import { describe, expect, it } from 'vitest';
import { sumStats } from './stats';

describe('sumStats', () => {
  it('totals tokens and cost, treating unknown cost as zero', () => {
    expect(
      sumStats([
        { model: 'a', promptTokens: 10, completionTokens: 5, costUsd: 0.01 },
        { model: 'b', promptTokens: 1, completionTokens: 1 },
      ]),
    ).toEqual({ calls: 2, promptTokens: 11, completionTokens: 6, costUsd: 0.01 });
  });
});
