import type { Actor, Message } from '@virtuocity/core';
import { describe, expect, it } from 'vitest';
import { sessionFigures, wordCount } from './figures';

const actors: Actor[] = [
  { id: 'you', controller: 'human', personality: { name: 'Ann', description: '' }, skillIds: [] },
  { id: 'n', controller: 'ai', personality: { name: 'Narrator', description: '' }, skillIds: [] },
];

const message = (id: string, actorId: string, kind: string, text: string): Message => ({
  id,
  actorId,
  kind,
  data: text,
  text,
  createdAt: 0,
});

describe('sessionFigures', () => {
  it('counts posts, words, characters, tokens, pictures and words per speaker', () => {
    const { groups } = sessionFigures(
      [
        message('1', 'you', 'text', 'Open the gate.'),
        message('2', 'n', 'text', 'The gate creaks open, slowly.'),
        message('3', 'n', 'image', 'A gate'),
      ],
      actors,
    );
    expect(groups).toEqual([
      {
        title: 'Length',
        figures: [
          { label: 'Posts', value: '3' },
          { label: 'Words', value: '8' },
          { label: 'Characters', value: '43' },
          { label: 'Tokens (estimate)', value: '≈ 13' },
          { label: 'Words per text post', value: '4' },
          { label: 'Pictures', value: '1' },
        ],
      },
      {
        title: 'Words per speaker',
        figures: [
          { label: 'Narrator', value: '5' },
          { label: 'Ann', value: '3' },
        ],
      },
    ]);
  });

  it('copes with an empty session and writes large numbers readably', () => {
    expect(sessionFigures([], actors).groups).toHaveLength(1);
    const long = message('1', 'n', 'text', 'word '.repeat(12480));
    const [length] = sessionFigures([long], actors).groups;
    expect(length?.figures[1]).toEqual({ label: 'Words', value: '12,480' });
  });

  it('counts words between any whitespace', () => {
    expect(wordCount('  a\nb\t c  ')).toBe(3);
    expect(wordCount('')).toBe(0);
  });
});
