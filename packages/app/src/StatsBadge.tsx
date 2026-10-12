import type { CallStats } from '@virtuocity/core';
import { sumStats } from '@virtuocity/core';

/** Model, tokens and cost for anything that involved AI calls. */
export function StatsBadge({ stats }: { stats: readonly CallStats[] }) {
  if (stats.length === 0) return null;
  const total = sumStats(stats);
  const models = [...new Set(stats.map((s) => s.model))].join(', ');
  return (
    <span className="stats">
      {models} · {total.promptTokens + total.completionTokens} tokens · ${total.costUsd.toFixed(4)}
    </span>
  );
}
