import type { JsonSchema } from '@virtuocity/core';

export type FieldKind =
  'object' | 'array' | 'string' | 'choice' | 'enum' | 'number' | 'boolean' | 'json';

type Schema = JsonSchema;

/** Which control renders a schema. Unknown shapes fall back to raw JSON. */
export function kindOf(schema: Schema): FieldKind {
  if (Array.isArray(schema.enum)) return 'enum';
  if (schema.type === 'string' && choicesOf(schema) !== undefined) return 'choice';
  switch (schema.type) {
    case 'object':
      return 'object';
    case 'array':
      return 'array';
    case 'string':
      return 'string';
    case 'number':
    case 'integer':
      return 'number';
    case 'boolean':
      return 'boolean';
    default:
      return 'json';
  }
}

/** The app list a text field picks from (see `choice` in core), if it picks from one. */
export function choicesOf(schema: Schema): string | undefined {
  return typeof schema.choices === 'string' ? schema.choices : undefined;
}

export function propertiesOf(schema: Schema): [string, Schema][] {
  return Object.entries(schema.properties ?? {}).filter(
    (entry): entry is [string, Schema] => typeof entry[1] === 'object',
  );
}

export function itemSchema(schema: Schema): Schema {
  return typeof schema.items === 'object' && !Array.isArray(schema.items) ? schema.items : {};
}

export function isRequired(schema: Schema, key: string): boolean {
  return schema.required?.includes(key) ?? false;
}

/** A starting value for a form: required fields filled with empty values. */
export function defaultValue(schema: Schema): unknown {
  switch (kindOf(schema)) {
    case 'object':
      return Object.fromEntries(
        propertiesOf(schema)
          .filter(([key]) => isRequired(schema, key))
          .map(([key, sub]) => [key, defaultValue(sub)]),
      );
    case 'array':
      return [];
    case 'enum':
      return schema.enum?.[0];
    case 'number':
      return 0;
    case 'boolean':
      return false;
    case 'string':
    case 'choice':
      return '';
    default:
      return null;
  }
}

/** Drops optional fields left empty, so "not filled in" doesn't fail validation. */
export function pruneEmpty(schema: Schema, value: unknown): unknown {
  if (kindOf(schema) === 'array' && Array.isArray(value)) {
    return value.map((v) => pruneEmpty(itemSchema(schema), v));
  }
  if (kindOf(schema) !== 'object' || value === null || typeof value !== 'object') return value;
  const record = value as Record<string, unknown>;
  const entries = propertiesOf(schema)
    .filter(([key]) => key in record)
    .filter(([key]) => isRequired(schema, key) || (record[key] !== '' && record[key] !== undefined))
    .map(([key, sub]) => [key, pruneEmpty(sub, record[key])]);
  return Object.fromEntries(entries);
}

/** `camelCase` or `snake_case` keys as readable labels. */
export function labelFor(key: string): string {
  const words = key.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/[_-]+/g, ' ');
  return words.charAt(0).toUpperCase() + words.slice(1).toLowerCase();
}
