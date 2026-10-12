/** Usage of a single AI call, attached to the message it produced. */
export interface CallStats {
  readonly model: string;
  readonly promptTokens: number;
  readonly completionTokens: number;
  /** Cost in USD as reported by the provider, if known. */
  readonly costUsd?: number;
}

export interface StatsTotal {
  readonly calls: number;
  readonly promptTokens: number;
  readonly completionTokens: number;
  readonly costUsd: number;
}

export function sumStats(stats: readonly CallStats[]): StatsTotal {
  return stats.reduce<StatsTotal>(
    (total, s) => ({
      calls: total.calls + 1,
      promptTokens: total.promptTokens + s.promptTokens,
      completionTokens: total.completionTokens + s.completionTokens,
      costUsd: total.costUsd + (s.costUsd ?? 0),
    }),
    { calls: 0, promptTokens: 0, completionTokens: 0, costUsd: 0 },
  );
}
