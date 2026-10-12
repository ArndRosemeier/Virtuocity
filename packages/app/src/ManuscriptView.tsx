import type { Chapter } from '@virtuocity/book-room';
import { MANUSCRIPT, chapterStatus, manuscriptDoc } from '@virtuocity/book-room';
import { EmptyState, Pill } from '@virtuocity/ui';
import type { PanelProps } from './types';
import { USER_ID } from './useSession';

function ChapterText({ chapter, index }: { chapter: Chapter; index: number }) {
  const paragraphs = (chapter.draft ?? '').split(/\n\s*\n/).filter((p) => p.trim());
  return (
    <article className="manuscript__chapter">
      <header className="manuscript__header">
        <h2>
          {index + 1}. {chapter.title}
        </h2>
        <Pill {...(chapter.approved ? { tone: 'accent' as const } : {})}>
          {chapterStatus(chapter)}
        </Pill>
      </header>
      <p className="muted">{chapter.brief}</p>
      {paragraphs.length === 0 && <p className="muted">Not written yet.</p>}
      {paragraphs.map((p, i) => (
        <p key={i}>{p}</p>
      ))}
    </article>
  );
}

/** The book as you would read it: every chapter with its latest draft. */
export function ManuscriptView({ session }: PanelProps) {
  const { chapters } = session.workspace.read(MANUSCRIPT, manuscriptDoc, USER_ID);
  return (
    <main className="feed manuscript">
      <div className="feed__inner">
        {chapters.length === 0 && (
          <EmptyState icon="edit" title="An empty book">
            Plan the first chapter in the Book panel, then let the writer start.
          </EmptyState>
        )}
        {chapters.map((c, i) => (
          <ChapterText key={c.id} chapter={c} index={i} />
        ))}
      </div>
    </main>
  );
}
