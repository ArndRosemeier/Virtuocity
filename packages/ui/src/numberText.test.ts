import { describe, expect, it } from 'vitest';
import { numberFromText, rangeText } from './numberText';

const words = { type: 'integer' as const, minimum: 20, maximum: 1000 };

describe('numberFromText', () => {
  it('reads typed numbers, rounding integers', () => {
    expect(numberFromText(' 300 ', words)).toBe(300);
    expect(numberFromText('42.6', words)).toBe(43);
    expect(numberFromText('0,5', { type: 'number' })).toBe(0.5);
  });

  it('keeps numbers within the range', () => {
    expect(numberFromText('3', words)).toBe(20);
    expect(numberFromText('5000', words)).toBe(1000);
  });

  it('is undefined for text that is not a number', () => {
    expect(numberFromText('', words)).toBeUndefined();
    expect(numberFromText('lots', words)).toBeUndefined();
  });
});

describe('rangeText', () => {
  it('describes the bounds', () => {
    expect(rangeText(words)).toBe('20 to 1000');
    expect(rangeText({ type: 'number', minimum: 0 })).toBe('at least 0');
    expect(rangeText({ type: 'number' })).toBe('');
  });
});
