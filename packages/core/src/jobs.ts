import type { EventBus } from './events';
import { defineEvent } from './events';

export type JobStatus = 'running' | 'done' | 'failed' | 'cancelled';

/** Long work that runs beside the story, such as generating a picture. */
export interface Job {
  readonly id: string;
  readonly actorId: string;
  /** What the job does, for people, e.g. "Illustrating the scene". */
  readonly label: string;
  readonly status: JobStatus;
  /** Between 0 and 1, when the job can tell. */
  readonly progress?: number;
  readonly detail?: string;
  readonly error?: string;
  readonly startedAt: number;
  readonly endedAt?: number;
}

/** What a running job gets: a signal that fires on cancel, and a way to report progress. */
export interface JobControl {
  readonly signal: AbortSignal;
  progress(fraction?: number, detail?: string): void;
}

/** How a job ended. Never rejects, so nobody has to wait on a background job. */
export type JobOutcome<T> =
  | { readonly status: 'done'; readonly value: T }
  | { readonly status: 'failed' | 'cancelled'; readonly error: string };

export const jobStarted = defineEvent<{ readonly jobId: string }>('job.started');
export const jobUpdated = defineEvent<{ readonly jobId: string }>('job.updated');
export const jobEnded = defineEvent<{ readonly jobId: string; readonly status: JobStatus }>(
  'job.ended',
);

export interface JobQueueOptions {
  readonly bus: EventBus;
  readonly newId: () => string;
  readonly now: () => number;
  /** How many finished jobs to keep. Default 50. */
  readonly limit?: number;
}

/** Background jobs: started by skills, shown to people, cancellable at any time. */
export class JobQueue {
  readonly #jobs = new Map<string, Job>();
  readonly #controllers = new Map<string, AbortController>();

  constructor(private readonly options: JobQueueOptions) {}

  list(): readonly Job[] {
    return [...this.#jobs.values()];
  }

  running(): readonly Job[] {
    return this.list().filter((j) => j.status === 'running');
  }

  get(id: string): Job | undefined {
    return this.#jobs.get(id);
  }

  /** Starts a job and returns at once; `done` settles when it ends. */
  start<T>(
    owner: { readonly actorId: string; readonly label: string },
    run: (control: JobControl) => Promise<T>,
  ): { readonly id: string; readonly done: Promise<JobOutcome<T>> } {
    const id = this.options.newId();
    const controller = new AbortController();
    this.#controllers.set(id, controller);
    this.#jobs.set(id, { id, ...owner, status: 'running', startedAt: this.options.now() });
    void this.options.bus.emit(jobStarted.create({ jobId: id }, owner.actorId));
    const control: JobControl = {
      signal: controller.signal,
      progress: (progress, detail) => {
        this.#update(id, {
          ...(progress === undefined ? {} : { progress }),
          ...(detail ? { detail } : {}),
        });
        void this.options.bus.emit(jobUpdated.create({ jobId: id }));
      },
    };
    const done = this.#run(id, controller, () => run(control));
    return { id, done };
  }

  /** Asks a running job to stop. Returns false when it is not running. */
  cancel(id: string): boolean {
    const controller = this.#controllers.get(id);
    if (!controller || this.#jobs.get(id)?.status !== 'running') return false;
    controller.abort(new Error('Cancelled'));
    return true;
  }

  /** Asks every running job of an actor to stop, e.g. when it leaves the session. */
  cancelOf(actorId: string): void {
    for (const job of this.running()) if (job.actorId === actorId) this.cancel(job.id);
  }

  async #run<T>(
    id: string,
    controller: AbortController,
    work: () => Promise<T>,
  ): Promise<JobOutcome<T>> {
    let outcome: JobOutcome<T>;
    try {
      const value = await work();
      outcome = controller.signal.aborted
        ? { status: 'cancelled', error: 'Cancelled' }
        : { status: 'done', value };
    } catch (error) {
      const status = controller.signal.aborted ? 'cancelled' : 'failed';
      outcome = { status, error: error instanceof Error ? error.message : String(error) };
    }
    this.#controllers.delete(id);
    const end = outcome.status === 'done' ? {} : { error: outcome.error };
    this.#update(id, { status: outcome.status, endedAt: this.options.now(), ...end });
    this.#prune();
    await this.options.bus.emit(jobEnded.create({ jobId: id, status: outcome.status }));
    return outcome;
  }

  #update(id: string, change: Partial<Job>): void {
    const job = this.#jobs.get(id);
    if (job) this.#jobs.set(id, { ...job, ...change });
  }

  #prune(): void {
    const finished = this.list().filter((j) => j.status !== 'running');
    const excess = finished.length - (this.options.limit ?? 50);
    for (const job of finished.slice(0, Math.max(0, excess))) this.#jobs.delete(job.id);
  }
}
