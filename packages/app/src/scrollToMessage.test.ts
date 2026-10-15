import { describe, expect, it, vi } from 'vitest';
import { MESSAGE_ID_ATTRIBUTE, scrollToMessage } from './scrollToMessage';

const drawn = (id: string) => {
  const element = {
    getAttribute: (name: string) => (name === MESSAGE_ID_ATTRIBUTE ? id : null),
    scrollIntoView: vi.fn(),
    animate: vi.fn(),
  };
  return element;
};

describe('scrollToMessage', () => {
  it('brings the drawn message into view', () => {
    const [a, b] = [drawn('1'), drawn('2')];
    const root = { querySelectorAll: () => [a, b] as unknown as Element[] };
    expect(scrollToMessage('2', root)).toBe(true);
    expect(b.scrollIntoView).toHaveBeenCalledOnce();
    expect(a.scrollIntoView).not.toHaveBeenCalled();
  });

  it('does nothing for a message that is not drawn', () => {
    const root = { querySelectorAll: () => [drawn('1')] as unknown as Element[] };
    expect(scrollToMessage('gone', root)).toBe(false);
  });
});
