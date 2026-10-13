import { speakerContract } from '@virtuocity/contract-speaker';
import { reviewerContract } from '@virtuocity/contract-critique';
import { sessionTypeContract } from '@virtuocity/core';
import { writerContract } from '@virtuocity/contract-writing';
import type { Starter } from '@virtuocity/core';

/**
 * The Book room session type: a writer and a reviewer working through a
 * manuscript, with you as the editor. The pipeline works in the manuscript,
 * not in a chat, so it shows no story or composer.
 */
export const bookRoomType: Starter = {
  id: 'book-room',
  personality: {
    name: 'Book room',
    description:
      'Plan chapters with briefs. A writer drafts each one, a reviewer asks for changes, and you approve.',
  },
  needs: [sessionTypeContract],
  settings: {
    'session-type': {
      castContracts: [speakerContract.id],
      roles: [
        {
          label: 'A writer',
          hint: 'Drafts each chapter from your brief.',
          needs: [writerContract.id],
        },
        {
          label: 'A reviewer',
          hint: 'Gives notes on every draft before it is revised.',
          needs: [reviewerContract.id],
        },
      ],
      panels: ['manuscript', 'book', 'tasks', 'cast', 'jobs'],
    },
  },
};

/** The book room's usual cast, offered in the library on a fresh start. */
export const bookRoomStarters: readonly Starter[] = [
  {
    id: 'writer',
    personality: {
      name: 'Quill',
      description: 'A novelist with a clear, vivid style who keeps scenes moving.',
    },
    needs: [writerContract],
  },
  {
    id: 'reviewer',
    personality: {
      name: 'Marlow',
      description: 'A demanding editor who cares about pacing, voice and continuity.',
    },
    needs: [reviewerContract],
  },
];
