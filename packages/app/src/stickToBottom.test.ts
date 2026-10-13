import { describe, expect, it } from 'vitest';
import { staysPinned } from './stickToBottom';

describe('staysPinned', () => {
  it('pins whenever the end is in view', () => {
    expect(staysPinned(false, { top: 500, previousTop: 900, belowView: 10 })).toBe(true);
  });

  it('lets go when the person scrolls up away from the end', () => {
    expect(staysPinned(true, { top: 400, previousTop: 900, belowView: 600 })).toBe(false);
  });

  it('stays pinned when content grew before the scroll event arrived', () => {
    // A reply is drawn (and folded) between our jump to the end and the scroll event.
    expect(staysPinned(true, { top: 2060, previousTop: 1979, belowView: 2147 })).toBe(true);
    expect(staysPinned(true, { top: 1979, previousTop: 1979, belowView: 2147 })).toBe(true);
  });

  it('does not pin again by scrolling down short of the end', () => {
    expect(staysPinned(false, { top: 900, previousTop: 400, belowView: 600 })).toBe(false);
  });
});
