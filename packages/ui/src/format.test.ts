import { describe, expect, it } from 'vitest';
import { hueIndex, initials } from './Avatar';
import { formatPricing, formatTokens, formatUsd } from './format';

describe('format', () => {
  it('formats money, tokens and pricing', () => {
    expect(formatUsd(0)).toBe('$0');
    expect(formatUsd(0.0012)).toBe('$0.0012');
    expect(formatUsd(1.5)).toBe('$1.50');
    expect(formatTokens(950)).toBe('950');
    expect(formatTokens(200_000)).toBe('200k');
    expect(formatTokens(1_048_576)).toBe('1.0M');
    const base = { id: 'm', name: 'M', inputs: ['text'], outputs: ['text'] };
    expect(formatPricing({ ...base, pricing: { prompt: 3, completion: 15 } })).toBe('$3 / $15');
    expect(formatPricing({ ...base, pricing: { prompt: 0, completion: 0 } })).toBe('free');
    expect(formatPricing({ ...base, pricing: { prompt: 0.15, completion: 0.6 } })).toBe(
      '$0.15 / $0.60',
    );
    expect(formatPricing(base)).toBeUndefined();
  });

  it('derives initials and a stable hue', () => {
    expect(initials('Lyra Moonwhisper')).toBe('LM');
    expect(initials('Vex')).toBe('V');
    expect(initials('  ')).toBe('?');
    expect(hueIndex('Vex')).toBe(hueIndex('Vex'));
  });
});
