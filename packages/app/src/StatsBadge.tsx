import type { CallStats } from '@virtuocity/core';
import { sumStats } from '@virtuocity/core';
import { Pill, formatUsd } from '@virtuocity/ui';

/** Model, tokens and cost for anything that involved AI calls. */
export function StatsBadge({
  stats,
  showModels = true,
}: {
  stats: readonly CallStats[];
  showModels?: boolean;
}) {
  if (stats.length === 0) return null;
  const total = sumStats(stats);
  const models = [...new Set(stats.map((s) => s.model))].join(', ');
  return (
    <span className="stats">
      {showModels && <span className="stats__model">{models}</span>}
      <Pill title={`${total.promptTokens} prompt + ${total.completionTokens} completion tokens`}>
        {total.promptTokens + total.completionTokens} tok
      </Pill>
      <Pill tone="accent" title="Cost reported by the provider">
        {formatUsd(total.costUsd)}
      </Pill>
    </span>
  );
}
