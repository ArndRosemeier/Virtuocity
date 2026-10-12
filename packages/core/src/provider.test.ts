import { describe, expect, it } from 'vitest';
import type { ModelInfo } from './provider';
import { modelsFor } from './provider';

const model = (id: string, outputs: string[]): ModelInfo => ({
  id,
  name: id,
  outputs,
  inputs: ['text'],
});

describe('modelsFor', () => {
  it('keeps models that can output the modality', () => {
    const all = [model('a', ['text']), model('b', ['image', 'text']), model('c', ['image'])];
    expect(modelsFor(all, 'image').map((m) => m.id)).toEqual(['b', 'c']);
  });
});
