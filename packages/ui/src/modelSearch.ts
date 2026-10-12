import type { ModelInfo } from '@virtuocity/core';

const LIMIT = 80;

/** Case-insensitive match on name and id; every word of the query must appear. */
export function searchModels(models: readonly ModelInfo[], query: string): ModelInfo[] {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  return models
    .filter((m) => {
      const haystack = `${m.name} ${m.id}`.toLowerCase();
      return words.every((w) => haystack.includes(w));
    })
    .slice(0, LIMIT);
}

/** One row in a model picker. `value: undefined` means "inherit from the layer below". */
export interface Choice {
  readonly key: string;
  readonly value: string | undefined;
  readonly name: string;
  readonly model?: ModelInfo;
}

/** Inherit option first, then matches, then the typed id (last, so Enter picks a real match). */
export function buildChoices(
  models: readonly ModelInfo[],
  inheritLabel: string | undefined,
  query: string,
): Choice[] {
  const custom = query.trim();
  const inherit: Choice[] =
    inheritLabel && !custom ? [{ key: '__default', value: undefined, name: inheritLabel }] : [];
  const found = searchModels(models, query).map((m): Choice => ({
    key: m.id,
    value: m.id,
    name: m.name,
    model: m,
  }));
  const typed: Choice[] =
    custom && !models.some((m) => m.id === custom)
      ? [{ key: '__custom', value: custom, name: `Use “${custom}” as model id` }]
      : [];
  return [...inherit, ...found, ...typed];
}
