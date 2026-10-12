import { useState } from 'react';
import type { Chapter } from '@virtuocity/book-room';
import { MANUSCRIPT, currentReviews, manuscriptDoc } from '@virtuocity/book-room';
import { reviewerContract } from '@virtuocity/contract-critique';
import { writerContract } from '@virtuocity/contract-writing';
import type { Contract, SessionRuntime } from '@virtuocity/core';
import { Button, Field, Pill, TextArea, TextInput } from '@virtuocity/ui';
import type { AppModule, PanelProps } from './types';
import { USER_ID } from './useSession';

function status(chapter: Chapter): string {
  if (chapter.approved) return 'approved';
  if (!chapter.draft) return 'planned';
  const reviews = currentReviews(chapter);
  if (reviews.some((r) => !r.approved)) return `draft ${chapter.round}: changes asked`;
  return `draft ${chapter.round}`;
}

function ChapterView({ chapter }: { chapter: Chapter }) {
  const last = currentReviews(chapter).at(-1);
  return (
    <details className="chapter">
      <summary>
        <strong>{chapter.title}</strong>{' '}
        <Pill {...(chapter.approved ? { tone: 'accent' as const } : {})}>{status(chapter)}</Pill>
      </summary>
      <p className="muted">{chapter.brief}</p>
      {chapter.draft && <p className="chapter__draft">{chapter.draft}</p>}
      {last && <p className="muted">Last review: {last.summary}</p>}
    </details>
  );
}

function AddChapter({ session }: { session: SessionRuntime }) {
  const [title, setTitle] = useState('');
  const [brief, setBrief] = useState('');
  const add = () => {
    const payload = {
      type: 'add-chapter',
      chapterId: crypto.randomUUID(),
      title: title.trim(),
      brief: brief.trim(),
    } as const;
    void session.workspace.view(USER_ID).change(MANUSCRIPT, manuscriptDoc, payload);
    setTitle('');
    setBrief('');
  };
  return (
    <div className="stack">
      <Field label="Chapter title">
        {(id) => <TextInput id={id} value={title} onChange={(e) => setTitle(e.target.value)} />}
      </Field>
      <Field label="Brief">
        {(id) => (
          <TextArea id={id} rows={2} value={brief} onChange={(e) => setBrief(e.target.value)} />
        )}
      </Field>
      <Button size="sm" icon="plus" disabled={!title.trim() || !brief.trim()} onClick={add}>
        Add chapter
      </Button>
    </div>
  );
}

/** AI actors that can fill a contract, so the pipeline can be staffed. */
function capable(session: SessionRuntime, contract: Contract) {
  return session.actors.filter(
    (a) => a.controller === 'ai' && session.implementationFor(a.id, contract),
  );
}

function RunPipeline({ session }: { session: SessionRuntime }) {
  const [error, setError] = useState('');
  const writer = capable(session, writerContract)[0];
  const reviewer = capable(session, reviewerContract)[0];
  const run = () => {
    if (!writer || !reviewer) return;
    setError('');
    const input = { writerId: writer.id, reviewerId: reviewer.id, editorId: USER_ID };
    void session.flows.run('book-pipeline', input).then((result) => {
      if (result.outcome === 'failed') setError(String(result.error));
    });
  };
  if (!writer || !reviewer) {
    return (
      <p className="muted">
        Add a character with the Writer skill and one with the Reviewer skill.
      </p>
    );
  }
  return (
    <div className="stack">
      <p className="muted">
        {writer.personality.name} writes, {reviewer.personality.name} reviews, you approve.
      </p>
      {error && <p className="composer__error">{error}</p>}
      <Button
        variant="primary"
        icon="sparkles"
        disabled={session.flows.running !== undefined}
        onClick={run}
      >
        Work on the next chapter
      </Button>
    </div>
  );
}

/** The book room: chapters with briefs, and the draft, review, approve pipeline. */
function BookPanel({ session }: PanelProps) {
  const { chapters } = session.workspace.read(MANUSCRIPT, manuscriptDoc, USER_ID);
  return (
    <div className="stack">
      {chapters.map((c) => (
        <ChapterView key={c.id} chapter={c} />
      ))}
      <AddChapter session={session} />
      {chapters.some((c) => !c.approved) && <RunPipeline session={session} />}
    </div>
  );
}

export const bookPanelModule: AppModule = {
  id: 'book-panel',
  register: (host) =>
    host.panels.register({ id: 'book', title: 'Book', slot: 'side', component: BookPanel }),
};
