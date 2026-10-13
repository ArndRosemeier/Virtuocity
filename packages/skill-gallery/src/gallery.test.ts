import type { Message } from '@virtuocity/core';
import { describe, expect, it } from 'vitest';
import { currentIndex } from './gallery';

const picture = (id: string): Message => ({
  id,
  createdAt: 0,
  kind: 'image',
  data: {},
  text: id,
  actorId: 'ink',
});
const shown = ['a', 'b', 'c'].map(picture);

describe('the current picture of a gallery', () => {
  it('is the newest when nobody picked one', () => {
    expect(currentIndex(shown, undefined)).toBe(2);
  });

  it('is the picked one while no newer picture arrived', () => {
    expect(currentIndex(shown, { messageId: 'a', newest: 'c' })).toBe(0);
  });

  it('jumps to a picture that arrived after the pick', () => {
    expect(currentIndex(shown, { messageId: 'a', newest: 'b' })).toBe(2);
  });

  it('falls back to the newest when the picked one is gone', () => {
    expect(currentIndex(shown, { messageId: 'x', newest: 'c' })).toBe(2);
  });

  it('is -1 without pictures', () => {
    expect(currentIndex([], undefined)).toBe(-1);
  });
});
