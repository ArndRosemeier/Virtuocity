import { describe, expect, it } from 'vitest';
import { isShown } from './openSpaces';

describe('isShown', () => {
  const state = { open: new Set(['summary']), closed: new Set(['picture']) };

  it('shows on-demand spaces only once opened', () => {
    expect(isShown(state, 'summary', true)).toBe(true);
    expect(isShown(state, 'other', true)).toBe(false);
  });

  it('shows every other space until it is closed', () => {
    expect(isShown(state, 'facts', false)).toBe(true);
    expect(isShown(state, 'picture', false)).toBe(false);
  });
});
