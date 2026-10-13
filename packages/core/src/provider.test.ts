import { describe, expect, it } from 'vitest';
import type { ModelInfo } from './provider';
import { chatText, modelsFor, withoutPictures } from './provider';

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

describe('pictures in chat messages', () => {
  const content = [
    { type: 'text', text: 'Look:' },
    { type: 'image', assetId: 'a', mime: 'image/png', alt: 'A fox' },
  ] as const;

  it('read as their description where only text counts', () => {
    expect(chatText(content)).toBe('Look:\n\nA fox');
    expect(chatText('plain')).toBe('plain');
  });

  it('become their description for models that cannot see', () => {
    expect(withoutPictures([{ role: 'user', content }])).toEqual([
      { role: 'user', content: 'Look:\n\nA fox' },
    ]);
  });
});
