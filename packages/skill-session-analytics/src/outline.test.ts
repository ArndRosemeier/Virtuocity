import type { Actor, Message } from '@virtuocity/core';
import { describe, expect, it } from 'vitest';
import { sessionOutline } from './outline';

const actors: Actor[] = [
  { id: 'you', controller: 'human', personality: { name: 'Ann', description: '' }, skillIds: [] },
  { id: 'n', controller: 'ai', personality: { name: 'Narrator', description: '' }, skillIds: [] },
];

const message = (id: string, actorId: string, kind: string, extra: Partial<Message> = {}) => ({
  id,
  actorId,
  kind,
  data: '',
  text: '',
  createdAt: 0,
  ...extra,
});

describe('sessionOutline', () => {
  it('tells posts apart by who wrote them, their kind, and whether people may see them', () => {
    const { rows } = sessionOutline(
      [
        message('1', 'you', 'text'),
        message('2', 'n', 'text'),
        message('3', 'n', 'image'),
        message('4', 'n', 'audio'),
        message('5', 'n', 'tool-use'),
        message('6', 'n', 'dice-roll'),
        message('7', 'n', 'text', { hiddenFrom: ['you'] }),
        message('8', 'gone', 'text'),
      ],
      actors,
    );
    expect(rows.map((r) => r.type)).toEqual([
      'person',
      'ai',
      'picture',
      'sound',
      'tool',
      'other',
      'hidden',
      'ai',
    ]);
    expect(rows[0]).toEqual({ messageId: '1', type: 'person', title: 'Ann · Text by a person' });
    expect(rows[7]?.title).toBe('gone · Text by an AI actor');
  });

  it('counts a secret kept from other AI actors only as what it is', () => {
    const { rows } = sessionOutline([message('1', 'n', 'text', { hiddenFrom: ['m'] })], actors);
    expect(rows[0]?.type).toBe('ai');
  });
});

describe('sessionOutline with markers', () => {
  it('puts each marker right after the post it follows, naming who placed it', () => {
    const { rows } = sessionOutline(
      [message('1', 'you', 'text'), message('2', 'n', 'text')],
      actors,
      [
        { afterId: '1', label: 'Summarized', actorId: 'n' },
        { afterId: 'gone', label: 'Lost', actorId: 'n' },
      ],
    );
    expect(rows.map((r) => r.type)).toEqual(['person', 'marker', 'ai']);
    expect(rows[1]).toEqual({
      messageId: '1',
      type: 'marker',
      title: 'Narrator · Summarized',
      markerOf: 'n',
    });
  });
});
