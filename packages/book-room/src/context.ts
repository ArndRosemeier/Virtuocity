import type { ContextContributor } from '@virtuocity/core';
import type { Chapter } from './manuscript';
import { MANUSCRIPT, manuscriptDoc } from './manuscript';

function status(chapter: Chapter): string {
  if (chapter.approved) return 'approved';
  if (chapter.draft !== undefined) return `draft ${chapter.round}, in review`;
  return 'planned';
}

/** The book's outline, so every actor knows what is being written. */
export const manuscriptContributor: ContextContributor = {
  id: 'manuscript',
  contribute: ({ state }) => {
    const { chapters } = state.read(MANUSCRIPT, manuscriptDoc);
    if (chapters.length === 0) return [];
    const lines = chapters.map((c, i) => `${i + 1}. ${c.title} (${status(c)}): ${c.brief}`);
    return [{ id: 'manuscript', title: 'The book so far', text: lines.join('\n'), priority: 40 }];
  },
};
