import type { ModelInfo } from '@virtuocity/core';

export function formatUsd(value: number): string {
  if (value === 0) return '$0';
  if (value < 0.01) return `$${value.toFixed(4)}`;
  return `$${value.toFixed(2)}`;
}

export function formatTokens(count: number): string {
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(count % 1_000_000 ? 1 : 0)}M`;
  if (count >= 1000) return `${Math.round(count / 1000)}k`;
  return String(count);
}

/** "$3 / $15" per million tokens, or "free". */
export function formatPricing(model: ModelInfo): string | undefined {
  if (!model.pricing) return undefined;
  const { prompt, completion } = model.pricing;
  if (prompt === 0 && completion === 0) return 'free';
  const fmt = (n: number) => `$${n < 1 ? n.toFixed(2) : Number(n.toFixed(2))}`;
  return `${fmt(prompt)} / ${fmt(completion)}`;
}
