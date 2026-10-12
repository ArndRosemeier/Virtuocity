import type { Message } from '@virtuocity/core';
import { describe, expect, it } from 'vitest';
import { linesToCover, storyLines } from './lines';

const line = (id: string) => ({ id, speaker: 'Narrator', text: id });
const lines = ['m1', 'm2', 'm3', 'm4', 'm5'].map(line);
/** Every line costs 10 tokens, so the numbers stay readable. */
const ten = () => 10;
const cover = (keepRecent: number, updateAfter: number, upTo?: string) =>
  linesToCover(lines, { keepRecent, updateAfter }, upTo, ten)?.map((l) => l.id);

describe('storyLines', () => {
  it('names speakers, reads each message as text and leaves out empty ones', () => {
    const message = (id: string, actorId: string, text = ''): Message => ({
      id,
      actorId,
      createdAt: 0,
      kind: text ? 'text' : 'image',
      data: text || {},
      text,
    });
    const actors = [
      {
        id: 'n',
        controller: 'ai' as const,
        personality: { name: 'Narrator', description: '' },
        skillIds: [],
      },
    ];
    const story = storyLines(
      [message('a', 'n', 'Rain.'), message('b', 'n'), message('c', 'x', 'Hi')],
      actors,
    );
    expect(story).toEqual([
      { id: 'a', speaker: 'Narrator', text: 'Rain.' },
      { id: 'c', speaker: 'x', text: 'Hi' },
    ]);
  });
});

describe('linesToCover', () => {
  it('leaves the newest story to the actors, who still read it', () => {
    expect(cover(20, 10)).toEqual(['m1', 'm2', 'm3']);
  });

  it('waits until enough story is not in the summary', () => {
    expect(cover(20, 40)).toBeUndefined();
    expect(cover(20, 20, 'm1')).toEqual(['m1', 'm2', 'm3']);
    expect(cover(20, 30, 'm1')).toBeUndefined();
  });

  it('has nothing to do when the summary is already ahead', () => {
    expect(cover(20, 10, 'm3')).toBeUndefined();
    expect(cover(20, 10, 'm5')).toBeUndefined();
  });

  it('covers everything again when the summarized lines are gone', () => {
    expect(cover(20, 30, 'rewound')).toEqual(['m1', 'm2', 'm3']);
  });

  it('does nothing while the whole story fits', () => {
    expect(cover(100, 10)).toBeUndefined();
  });
});
