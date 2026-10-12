import { reviewerContract } from '@virtuocity/contract-critique';
import { writerContract } from '@virtuocity/contract-writing';
import { defineBlueprint } from '@virtuocity/core';

/** A writer and a reviewer working through a manuscript, with you as the editor. */
export const bookRoomBlueprint = defineBlueprint({
  id: 'book-room',
  name: 'Book room',
  description:
    'Plan chapters with briefs. A writer drafts each one, a reviewer asks for changes, and you approve.',
  roles: [
    {
      id: 'writer',
      label: 'A writer',
      hint: 'Drafts each chapter from your brief.',
      personality: {
        name: 'Quill',
        description: 'A novelist with a clear, vivid style who keeps scenes moving.',
      },
      needs: [writerContract],
    },
    {
      id: 'reviewer',
      label: 'A reviewer',
      hint: 'Gives notes on every draft before it is revised.',
      personality: {
        name: 'Marlow',
        description: 'A demanding editor who cares about pacing, voice and continuity.',
      },
      needs: [reviewerContract],
    },
  ],
  // The pipeline works in the manuscript, not in a chat, so there is no story or composer.
  layout: {
    left: [],
    main: ['manuscript'],
    input: [],
    side: ['book', 'tasks', 'cast', 'jobs'],
  },
});
