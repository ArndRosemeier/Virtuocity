import { defineDocType, z } from '@virtuocity/core';

export interface ChapterReview {
  readonly by: string;
  /** The draft round this review is about (1 for the first draft). */
  readonly round: number;
  readonly approved: boolean;
  readonly summary: string;
  readonly notes: readonly string[];
}

export interface Chapter {
  readonly id: string;
  readonly title: string;
  readonly brief: string;
  readonly draft?: string;
  readonly round: number;
  readonly reviews: readonly ChapterReview[];
  readonly approved: boolean;
}

export interface Manuscript {
  readonly chapters: readonly Chapter[];
}

export type ManuscriptOp =
  | {
      readonly type: 'add-chapter';
      readonly chapterId: string;
      readonly title: string;
      readonly brief: string;
    }
  | { readonly type: 'draft'; readonly chapterId: string; readonly text: string }
  | {
      readonly type: 'review';
      readonly chapterId: string;
      readonly review: Omit<ChapterReview, 'round'>;
    }
  | { readonly type: 'approve'; readonly chapterId: string };

const review = z.object({
  by: z.string(),
  approved: z.boolean(),
  summary: z.string(),
  notes: z.array(z.string()),
});

function update(state: Manuscript, chapterId: string, change: (c: Chapter) => Chapter): Manuscript {
  return { chapters: state.chapters.map((c) => (c.id === chapterId ? change(c) : c)) };
}

/** A book as chapters, each with a brief, its current draft and the reviews of each round. */
export const manuscriptDoc = defineDocType<Manuscript, ManuscriptOp>({
  id: 'manuscript',
  version: 1,
  description: 'Chapters with briefs, drafts, reviews and approval.',
  op: z.discriminatedUnion('type', [
    z.object({
      type: z.literal('add-chapter'),
      chapterId: z.string(),
      title: z.string(),
      brief: z.string(),
    }),
    z.object({ type: z.literal('draft'), chapterId: z.string(), text: z.string() }),
    z.object({ type: z.literal('review'), chapterId: z.string(), review }),
    z.object({ type: z.literal('approve'), chapterId: z.string() }),
  ]),
  initial: () => ({ chapters: [] }),
  apply: (state, op) => {
    switch (op.type) {
      case 'add-chapter': {
        if (state.chapters.some((c) => c.id === op.chapterId)) return state;
        const chapter = {
          id: op.chapterId,
          title: op.title,
          brief: op.brief,
          round: 0,
          reviews: [],
          approved: false,
        };
        return { chapters: [...state.chapters, chapter] };
      }
      case 'draft':
        return update(state, op.chapterId, (c) => ({
          ...c,
          draft: op.text,
          round: c.round + 1,
          approved: false,
        }));
      case 'review':
        return update(state, op.chapterId, (c) => ({
          ...c,
          reviews: [...c.reviews, { ...op.review, round: c.round }],
        }));
      case 'approve':
        return update(state, op.chapterId, (c) => ({ ...c, approved: true }));
    }
  },
});

/** The document id of the session's manuscript. */
export const MANUSCRIPT = 'manuscript';

/** Reviews of the chapter's current draft. */
export function currentReviews(chapter: Chapter): readonly ChapterReview[] {
  return chapter.reviews.filter((r) => r.round === chapter.round);
}
