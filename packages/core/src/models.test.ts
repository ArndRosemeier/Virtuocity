import { describe, expect, it } from 'vitest';
import { resolveModel } from './models';

describe('resolveModel', () => {
  const defaults = { text: 'core-text', image: 'core-image' };

  it('prefers skill over actor over core default', () => {
    expect(
      resolveModel('text', { defaults, actor: { text: 'actor' }, skill: { text: 'skill' } }),
    ).toBe('skill');
    expect(resolveModel('text', { defaults, actor: { text: 'actor' } })).toBe('actor');
    expect(resolveModel('image', { defaults, actor: { text: 'actor' } })).toBe('core-image');
  });

  it('throws when nothing is configured', () => {
    expect(() => resolveModel('music', { defaults })).toThrow(/music/);
  });
});
