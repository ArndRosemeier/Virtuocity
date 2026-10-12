import { describe, expect, it } from 'vitest';
import { buildChoices, searchModels } from './modelSearch';

const m = (id: string, name: string) => ({ id, name, inputs: ['text'], outputs: ['text'] });

describe('searchModels', () => {
  it('matches every word against name and id', () => {
    const models = [
      m('anthropic/claude-x', 'Claude X'),
      m('openai/gpt-y', 'GPT Y'),
      m('mistral/large', 'Large'),
    ];
    expect(searchModels(models, 'claude').map((x) => x.id)).toEqual(['anthropic/claude-x']);
    expect(searchModels(models, 'OPENAI y').map((x) => x.id)).toEqual(['openai/gpt-y']);
    expect(searchModels(models, '')).toHaveLength(3);
  });
});

describe('buildChoices', () => {
  const models = [m('anthropic/claude-x', 'Claude X')];

  it('offers the inherit option only without a query', () => {
    expect(buildChoices(models, 'Use the default', '').map((c) => c.value)).toEqual([
      undefined,
      'anthropic/claude-x',
    ]);
  });

  it('puts a typed custom id after real matches', () => {
    expect(buildChoices(models, 'Use the default', 'claude').map((c) => c.value)).toEqual([
      'anthropic/claude-x',
      'claude',
    ]);
    expect(buildChoices(models, undefined, 'anthropic/claude-x')).toHaveLength(1);
  });
});
