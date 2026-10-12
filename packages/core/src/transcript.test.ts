import { describe, expect, it } from 'vitest';
import { textOf } from './transcript';

describe('textOf', () => {
  it('joins the text parts and leaves the rest out', () => {
    const message = {
      id: 'm1',
      actorId: 'a',
      createdAt: 0,
      parts: [
        { kind: 'text', data: 'The door creaks. ' },
        { kind: 'image', data: { assetId: 'x' } },
        { kind: 'text', data: 'Someone is there.' },
      ],
    };
    expect(textOf(message)).toBe('The door creaks. \nSomeone is there.');
  });

  it('is empty for a message without text', () => {
    expect(textOf({ id: 'm2', actorId: 'a', createdAt: 0, parts: [] })).toBe('');
  });
});
