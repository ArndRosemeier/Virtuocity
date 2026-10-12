import { reviewerContract } from '@virtuocity/contract-critique';
import { writerContract } from '@virtuocity/contract-writing';
import type { FlowContext } from '@virtuocity/core';
import { defineFlow, z } from '@virtuocity/core';
import type { Chapter, Manuscript } from './manuscript';
import { MANUSCRIPT, currentReviews, manuscriptDoc } from './manuscript';

export interface PipelineInput {
  readonly writerId: string;
  readonly reviewerId: string;
  /** Has the final say on each chapter; typically the human. */
  readonly editorId: string;
  /** Most drafts per chapter in one run before pausing for you. */
  readonly maxRounds?: number | undefined;
}

const CONTEXT_TAIL = 1500;

/** Earlier chapters as context for the writer: their briefs, and how the last one ended. */
function contextFor(manuscript: Manuscript, chapter: Chapter): string {
  const before = manuscript.chapters.slice(0, manuscript.chapters.indexOf(chapter));
  const outline = before.map((c, i) => `${i + 1}. ${c.title}: ${c.brief}`).join('\n');
  const last = before.at(-1)?.draft?.slice(-CONTEXT_TAIL);
  return [outline && `Earlier chapters:\n${outline}`, last && `The previous chapter ends:\n${last}`]
    .filter(Boolean)
    .join('\n\n');
}

async function draft(ctx: FlowContext, input: PipelineInput, chapter: Chapter): Promise<void> {
  const manuscript = ctx.state.read(MANUSCRIPT, manuscriptDoc);
  const notes = currentReviews(chapter).flatMap((r) => (r.approved ? [] : [r.summary, ...r.notes]));
  const { text } = await ctx.invoke(input.writerId, writerContract, 'write', {
    brief: `${chapter.title}: ${chapter.brief}`,
    context: contextFor(manuscript, chapter) || undefined,
    previousDraft: chapter.draft,
    notes: notes.length > 0 ? notes : undefined,
  });
  await ctx.state.change(MANUSCRIPT, manuscriptDoc, { type: 'draft', chapterId: chapter.id, text });
}

async function review(ctx: FlowContext, reviewerId: string, chapter: Chapter): Promise<boolean> {
  const result = await ctx.invoke(reviewerId, reviewerContract, 'review', {
    text: chapter.draft ?? '',
    focus: `Does it deliver this brief? ${chapter.brief}`,
  });
  const notes = result.notes.map((n) => (n.quote ? `"${n.quote}": ${n.comment}` : n.comment));
  const entry = { by: reviewerId, approved: result.approved, summary: result.summary, notes };
  await ctx.state.change(MANUSCRIPT, manuscriptDoc, {
    type: 'review',
    chapterId: chapter.id,
    review: entry,
  });
  return result.approved;
}

const chapterOf = (ctx: FlowContext, id: string) =>
  ctx.state.read(MANUSCRIPT, manuscriptDoc).chapters.find((c) => c.id === id);

/**
 * The book room: the writer drafts the first unapproved chapter, the reviewer
 * gives notes until satisfied, then the editor decides. A rejection sends the
 * notes back to the writer. Everything lives in the manuscript, so the flow
 * resumes wherever the document says it is.
 */
export const bookPipelineFlow = defineFlow<PipelineInput>({
  id: 'book-pipeline',
  name: 'Book pipeline',
  description: 'Draft, review and approve the next chapter.',
  input: z.object({
    writerId: z.string(),
    reviewerId: z.string(),
    editorId: z.string(),
    maxRounds: z.number().int().positive().optional(),
  }),
  run: async (ctx, input) => {
    const next = ctx.state.read(MANUSCRIPT, manuscriptDoc).chapters.find((c) => !c.approved);
    if (!next) return;
    for (let round = 0; round < (input.maxRounds ?? 3); round++) {
      let chapter = chapterOf(ctx, next.id) ?? next;
      const pending = !chapter.draft || currentReviews(chapter).some((r) => !r.approved);
      if (pending) await draft(ctx, input, chapter);
      chapter = chapterOf(ctx, next.id) ?? chapter;
      const reviewed = currentReviews(chapter).some((r) => r.by === input.reviewerId && r.approved);
      if (!reviewed && !(await review(ctx, input.reviewerId, chapter))) continue;
      if (!(await review(ctx, input.editorId, chapter))) continue;
      await ctx.state.change(MANUSCRIPT, manuscriptDoc, { type: 'approve', chapterId: chapter.id });
      return;
    }
  },
});
