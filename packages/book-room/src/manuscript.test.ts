import { describe, expect, it } from 'vitest';
import type { Chapter } from './manuscript';
import { chapterStatus } from './manuscript';

const planned: Chapter = {
  id: 'c',
  title: 'Rain',
  brief: 'It rains.',
  round: 0,
  reviews: [],
  approved: false,
};
const review = { by: 'r', round: 1, summary: '', notes: [] };

describe('chapter status', () => {
  it('follows a chapter from plan to approval', () => {
    const drafted = { ...planned, draft: 'Rain fell.', round: 1 };
    expect(chapterStatus(planned)).toBe('planned');
    expect(chapterStatus(drafted)).toBe('draft 1');
    expect(chapterStatus({ ...drafted, reviews: [{ ...review, approved: false }] })).toBe(
      'draft 1: changes asked',
    );
    expect(chapterStatus({ ...drafted, approved: true })).toBe('approved');
  });
});
