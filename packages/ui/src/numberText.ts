import type { JsonSchema } from '@virtuocity/core';

/**
 * The number typed text stands for, kept within the schema's range and
 * rounded for integers; undefined when the text is not a number.
 */
export function numberFromText(text: string, schema: JsonSchema): number | undefined {
  const trimmed = text.trim().replace(',', '.');
  if (trimmed === '') return undefined;
  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed)) return undefined;
  const whole = schema.type === 'integer' ? Math.round(parsed) : parsed;
  const min = typeof schema.minimum === 'number' ? schema.minimum : -Infinity;
  const max = typeof schema.maximum === 'number' ? schema.maximum : Infinity;
  return Math.min(max, Math.max(min, whole));
}

/** The allowed range as a hint, e.g. "20 to 1000"; empty without bounds. */
export function rangeText(schema: JsonSchema): string {
  const { minimum: min, maximum: max } = schema;
  if (typeof min === 'number' && typeof max === 'number') return `${min} to ${max}`;
  if (typeof min === 'number') return `at least ${min}`;
  if (typeof max === 'number') return `at most ${max}`;
  return '';
}
