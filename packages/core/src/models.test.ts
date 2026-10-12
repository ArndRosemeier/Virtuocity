import { describe, expect, it } from 'vitest';
import {
  parseModelRef,
  qualifyModel,
  qualifyOverrides,
  readModelRef,
  resolveModel,
} from './models';

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

describe('model references', () => {
  it('splits provider and model at the first colon', () => {
    expect(parseModelRef('openrouter:meta/llama:free')).toEqual({
      provider: 'openrouter',
      model: 'meta/llama:free',
    });
    expect(readModelRef('anthropic/claude')).toBeUndefined();
    expect(() => parseModelRef('anthropic/claude')).toThrow(/provider/);
  });

  it('gives ids saved without a provider to the given one, and leaves others alone', () => {
    expect(qualifyModel('openrouter/auto', 'openrouter')).toBe('openrouter:openrouter/auto');
    expect(qualifyModel('meta/llama:free', 'openrouter')).toBe('openrouter:meta/llama:free');
    expect(qualifyModel('anthropic:claude-opus-5-5', 'openrouter')).toBe(
      'anthropic:claude-opus-5-5',
    );
    expect(qualifyOverrides({ text: 'x/y', image: 'openai:gpt-image-1' }, 'openrouter')).toEqual({
      text: 'openrouter:x/y',
      image: 'openai:gpt-image-1',
    });
  });
});
