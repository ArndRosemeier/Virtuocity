import { describe, expect, it } from 'vitest';
import { transformPrompt } from './transform';

describe('transform prompt', () => {
  it('names the field, the actor and what else is known, then the text', () => {
    const [system, user] = transformPrompt(
      { label: 'Personality', hint: 'Voice and quirks' },
      ' grumpy teen ',
      {
        name: 'Wren',
        known: [
          ['Appearance', 'Short, freckled'],
          ['Personality', 'old'],
          ['Style', ' '],
        ],
      },
    );
    expect(system?.role).toBe('system');
    expect(user?.content).toBe(
      'Field: Personality (Voice and quirks)\nActor: Wren\nAppearance: Short, freckled\n\nText to transform:\n"""\ngrumpy teen\n"""',
    );
  });

  it('works without an actor', () => {
    const [, user] = transformPrompt({ label: 'Premise' }, 'lighthouse');
    expect(user?.content).toBe('Field: Premise\n\nText to transform:\n"""\nlighthouse\n"""');
  });
});
