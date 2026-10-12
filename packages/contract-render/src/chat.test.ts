import type { Actor } from '@virtuocity/core';
import { describe, expect, it } from 'vitest';
import { chatView } from './chat';

describe('chatView', () => {
  const actors: Actor[] = [
    { id: 'you', controller: 'human', personality: { name: 'You', description: '' }, skillIds: [] },
    { id: 'n', controller: 'ai', personality: { name: 'Narrator', description: '' }, skillIds: [] },
  ];

  it('names each speaker, marks people and keeps each message as it is', () => {
    const stats = [{ model: 'm', promptTokens: 1, completionTokens: 2, costUsd: 0 }];
    const view = chatView(
      [
        { id: '1', actorId: 'you', kind: 'text', data: 'Go on.', text: 'Go on.', createdAt: 0 },
        {
          id: '2',
          actorId: 'n',
          kind: 'image',
          data: { assetId: 'a' },
          text: 'A gate',
          createdAt: 1,
          stats,
        },
        { id: '3', actorId: 'gone', kind: 'text', data: 'Boo', text: 'Boo', createdAt: 2 },
      ],
      actors,
    );
    expect(view.entries).toEqual([
      { id: '1', actorId: 'you', name: 'You', human: true, part: { kind: 'text', data: 'Go on.' } },
      {
        id: '2',
        actorId: 'n',
        name: 'Narrator',
        human: false,
        part: { kind: 'image', data: { assetId: 'a' } },
        stats,
      },
      { id: '3', actorId: 'gone', name: 'gone', human: false, part: { kind: 'text', data: 'Boo' } },
    ]);
  });
});

describe('chatView with a part of its own', () => {
  it('draws each message the way the renderer says', () => {
    const message = { id: '1', actorId: 'x', kind: 'text', data: 'Hi', text: 'Hi', createdAt: 0 };
    const view = chatView([message], [], (m) => ({ kind: 'shout', data: m.text.toUpperCase() }));
    expect(view.entries[0]?.part).toEqual({ kind: 'shout', data: 'HI' });
  });
});
