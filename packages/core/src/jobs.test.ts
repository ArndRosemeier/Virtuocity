import { describe, expect, it } from 'vitest';
import { EventBus } from './events';
import { JobQueue, jobEnded, jobUpdated } from './jobs';

function queue(limit?: number) {
  let n = 0;
  const bus = new EventBus();
  const jobs = new JobQueue({
    bus,
    newId: () => `job-${++n}`,
    now: () => n,
    ...(limit ? { limit } : {}),
  });
  return { bus, jobs };
}

const owner = { actorId: 'ink', label: 'Drawing' };

describe('JobQueue', () => {
  it('runs a job beside the caller and reports progress and the outcome', async () => {
    const { bus, jobs } = queue();
    const events: string[] = [];
    bus.on('*', (e) => void events.push(e.type));
    let release = () => {};
    const gate = new Promise<void>((resolve) => (release = resolve));
    const { id, done } = jobs.start(owner, async ({ progress }) => {
      progress(0.5, 'Halfway');
      await gate;
      return 42;
    });
    expect(jobs.running().map((j) => j.id)).toEqual([id]);
    expect(jobs.get(id)).toMatchObject({ progress: 0.5, detail: 'Halfway', label: 'Drawing' });
    release();
    await expect(done).resolves.toEqual({ status: 'done', value: 42 });
    expect(jobs.get(id)?.status).toBe('done');
    expect(events).toContain(jobUpdated.type);
    expect(events.at(-1)).toBe(jobEnded.type);
  });

  it('turns errors into a failed outcome instead of throwing', async () => {
    const { jobs } = queue();
    const { id, done } = jobs.start(owner, () => Promise.reject(new Error('No image model')));
    await expect(done).resolves.toEqual({ status: 'failed', error: 'No image model' });
    expect(jobs.get(id)?.error).toBe('No image model');
  });

  it('cancels through the signal', async () => {
    const { jobs } = queue();
    const { id, done } = jobs.start(
      owner,
      ({ signal }) =>
        new Promise((_, reject) => signal.addEventListener('abort', () => reject(signal.reason))),
    );
    expect(jobs.cancel(id)).toBe(true);
    await expect(done).resolves.toMatchObject({ status: 'cancelled' });
    expect(jobs.cancel(id)).toBe(false);
  });

  it('keeps only recent finished jobs', async () => {
    const { jobs } = queue(1);
    await jobs.start(owner, () => Promise.resolve(1)).done;
    await jobs.start(owner, () => Promise.resolve(2)).done;
    expect(jobs.list().map((j) => j.id)).toEqual(['job-2']);
  });
});
