import { describe, expect, it } from 'vitest';
import { withInstructions } from './instructions';

describe('withInstructions', () => {
  const user = { role: 'user', content: 'Hi' } as const;

  it('combines instructions ahead of the call’s own system prompt', () => {
    const system = { role: 'system', content: 'You are Lyra.' } as const;
    expect(
      withInstructions([system, user], ['Use British spelling.', ' ', 'Mark speech with >']),
    ).toEqual([
      { role: 'system', content: 'Use British spelling.\n\nMark speech with >\n\nYou are Lyra.' },
      user,
    ]);
  });

  it('adds a system prompt when the call has none, and changes nothing without instructions', () => {
    expect(withInstructions([user], ['Be brief.'])).toEqual([
      { role: 'system', content: 'Be brief.' },
      user,
    ]);
    const messages = [user];
    expect(withInstructions(messages, [])).toBe(messages);
  });
});
