import type { StateView } from '@virtuocity/core';
import { describe, expect, it } from 'vitest';
import { manuscriptContributor } from './context';
import type { Manuscript } from './manuscript';

const view = (manuscript: Manuscript): StateView => ({
  read: <S>() => manuscript as S,
  change: () => Promise.reject(new Error('read only')),
});

const request = (manuscript: Manuscript) => ({
  actor: {
    id: 'a',
    controller: 'ai' as const,
    personality: { name: 'A', description: '' },
    skillIds: [],
  },
  actors: [],
  cast: [],
  state: view(manuscript),
  transcript: [],
});

describe('manuscript context', () => {
  it('outlines the chapters with their status', () => {
    const chapter = { reviews: [], round: 0, approved: false };
    const [piece] = manuscriptContributor.contribute(
      request({
        chapters: [
          {
            ...chapter,
            id: '1',
            title: 'Arrival',
            brief: 'Mira arrives.',
            approved: true,
            draft: 'x',
            round: 1,
          },
          { ...chapter, id: '2', title: 'The door', brief: 'It opens.', draft: 'y', round: 2 },
          { ...chapter, id: '3', title: 'Night', brief: 'Dark.' },
        ],
      }),
    );
    expect(piece?.text).toBe(
      '1. Arrival (approved): Mira arrives.\n2. The door (draft 2, in review): It opens.\n3. Night (planned): Dark.',
    );
  });

  it('adds nothing for an empty book', () => {
    expect(manuscriptContributor.contribute(request({ chapters: [] }))).toEqual([]);
  });
});
