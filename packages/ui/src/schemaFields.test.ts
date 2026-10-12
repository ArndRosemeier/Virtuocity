import { z } from '@virtuocity/core';
import { describe, expect, it } from 'vitest';
import { defaultValue, kindOf, labelFor, pruneEmpty } from './schemaFields';

const review = z.toJSONSchema(
  z.object({
    approved: z.boolean(),
    summary: z.string(),
    notes: z.array(z.object({ comment: z.string(), quote: z.string().optional() })),
    mood: z.enum(['calm', 'tense']).optional(),
  }),
);

describe('schema forms', () => {
  it('maps schemas to controls', () => {
    expect(kindOf(review)).toBe('object');
    expect(kindOf(z.toJSONSchema(z.enum(['a', 'b'])))).toBe('enum');
    expect(kindOf(z.toJSONSchema(z.number().int()))).toBe('number');
    expect(kindOf({})).toBe('json');
  });

  it('starts with required fields only', () => {
    expect(defaultValue(review)).toEqual({ approved: false, summary: '', notes: [] });
  });

  it('removes optional fields left empty, also inside lists', () => {
    const value = {
      approved: true,
      summary: 'ok',
      notes: [{ comment: 'tighten', quote: '' }],
      mood: '',
    };
    expect(pruneEmpty(review, value)).toEqual({
      approved: true,
      summary: 'ok',
      notes: [{ comment: 'tighten' }],
    });
  });

  it('turns keys into labels', () => {
    expect(labelFor('promptTokens')).toBe('Prompt tokens');
    expect(labelFor('max_steps')).toBe('Max steps');
  });
});
