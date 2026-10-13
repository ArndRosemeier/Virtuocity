import { reviewerContract } from '@virtuocity/contract-critique';
import { writerContract } from '@virtuocity/contract-writing';
import type { Actor, Skill } from '@virtuocity/core';
import {
  ModuleHost,
  SessionRuntime,
  coreModule,
  humanTaskCreated,
  implement,
  loadModules,
} from '@virtuocity/core';
import { describe, expect, it } from 'vitest';
import { bookRoomModule } from './index';
import { MANUSCRIPT, manuscriptDoc } from './manuscript';

const drafts: string[] = [];
const writer: Skill = {
  id: 'fake-writer',
  name: 'Writer',
  backing: 'code',
  implements: [
    implement(writerContract, {
      write: ({ previousDraft, notes }) => {
        const text = previousDraft
          ? `${previousDraft} (revised: ${notes?.join('; ') ?? ''})`
          : 'First draft.';
        drafts.push(text);
        return Promise.resolve({ text });
      },
    }),
  ],
};

/** Rejects the first draft it sees, approves after that. */
function strictReviewer(): Skill {
  let seen = 0;
  return {
    id: 'fake-reviewer',
    name: 'Reviewer',
    backing: 'code',
    implements: [
      implement(reviewerContract, {
        critique: () => Promise.resolve({ notes: [] }),
        review: () =>
          Promise.resolve(
            seen++ === 0
              ? { approved: false, summary: 'Too thin.', notes: [{ comment: 'Add the storm.' }] }
              : { approved: true, summary: 'Good.', notes: [] },
          ),
      }),
    ],
  };
}

const actor = (id: string, controller: Actor['controller'], skillIds: string[] = []): Actor => ({
  id,
  controller,
  personality: { name: id, description: '' },
  skillIds,
});

async function setup(editorApproves: boolean[]) {
  const host = loadModules(new ModuleHost(), [coreModule, bookRoomModule]);
  host.skills.register(writer);
  host.skills.register(strictReviewer());
  const session = new SessionRuntime({
    host,
    modelDefaults: () => ({}),
  });
  await session.join(actor('ada', 'ai', ['fake-writer']));
  await session.join(actor('rex', 'ai', ['fake-reviewer']));
  await session.join(actor('me', 'human'));
  session.bus.on(humanTaskCreated, ({ payload }) => {
    const approved = editorApproves.shift() ?? true;
    setTimeout(
      () =>
        void session.tasks.submit(payload.taskId, {
          approved,
          summary: approved ? 'Yes' : 'Darker',
          notes: [],
        }),
    );
  });
  const view = session.workspace.view('me');
  await view.change(MANUSCRIPT, manuscriptDoc, {
    type: 'add-chapter',
    chapterId: 'c1',
    title: 'Arrival',
    brief: 'Mira reaches the house in a storm.',
  });
  return session;
}

const input = { writerId: 'ada', reviewerId: 'rex', editorId: 'me' };

describe('book pipeline', () => {
  it('drafts, revises from the reviewer notes, and approves when the editor agrees', async () => {
    drafts.length = 0;
    const session = await setup([true]);
    const result = await session.flows.run('book-pipeline', input);
    expect(result.outcome).toBe('paused');
    const [chapter] = session.workspace.read(MANUSCRIPT, manuscriptDoc).chapters;
    expect(chapter?.approved).toBe(true);
    expect(chapter?.round).toBe(2);
    expect(drafts[1]).toMatch(/Too thin\.; Add the storm\./);
    expect(chapter?.reviews.map((r) => `${r.by}:${r.round}:${r.approved}`)).toEqual([
      'rex:1:false',
      'rex:2:true',
      'me:2:true',
    ]);
  });

  it("sends the editor's rejection back to the writer", async () => {
    drafts.length = 0;
    const session = await setup([false, true]);
    await session.flows.run('book-pipeline', input);
    const [chapter] = session.workspace.read(MANUSCRIPT, manuscriptDoc).chapters;
    expect(chapter?.approved).toBe(true);
    expect(chapter?.round).toBe(3);
    expect(drafts[2]).toMatch(/Darker/);
  });

  it('pauses after the round limit without approving', async () => {
    const session = await setup([false, false, false]);
    await session.flows.run('book-pipeline', { ...input, maxRounds: 2 });
    expect(session.workspace.read(MANUSCRIPT, manuscriptDoc).chapters[0]?.approved).toBe(false);
  });
});
