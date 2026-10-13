import { describe, expect, it } from 'vitest';
import { MIN_HEIGHT, heightCss, movedHeight } from './spaceHeight';

describe('space height', () => {
  it('moves with the drag, within a minimum and the window', () => {
    expect(movedHeight(200, 50, 800)).toBe(250);
    expect(movedHeight(200, -500, 800)).toBe(MIN_HEIGHT);
    expect(movedHeight(700, 300, 800)).toBe(800);
  });

  it('uses the default third until a height is stored', () => {
    expect(heightCss('')).toBeUndefined();
    expect(heightCss('nonsense')).toBeUndefined();
    expect(heightCss('321.6')).toBe('322px');
  });
});
