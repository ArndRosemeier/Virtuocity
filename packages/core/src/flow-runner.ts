import type { Actor } from './actor';
import type { EventBus } from './events';
import type { Flow, FlowContext, FlowResult } from './flow';
import { FlowStop, flowEnded, flowStarted } from './flow';
import type { HumanTaskQueue } from './human-tasks';
import type { InvokeAction } from './skill-context';
import type { Message } from './transcript';
import type { Workspace } from './workspace';

/** The parts of a session a flow run needs. `SessionRuntime` provides them. */
export interface FlowHost {
  readonly bus: EventBus;
  readonly workspace: Workspace;
  readonly tasks: HumanTaskQueue;
  readonly actors: readonly Actor[];
  readonly invoke: InvokeAction;
  transcript(): readonly Message[];
  runTurn(actorId: string): Promise<void>;
  pickNext(): Promise<Actor | undefined>;
}

export interface RunOptions {
  /** Most turns and actions one run may take before it pauses. */
  readonly maxSteps?: number;
}

const DEFAULT_MAX_STEPS = 20;

/** Runs one flow at a time, with step limits and interrupts. */
export class FlowRunner {
  #controller: AbortController | undefined;
  #running: string | undefined;

  constructor(
    private readonly host: FlowHost,
    private readonly flows: (id: string) => Flow,
  ) {}

  /** Id of the flow that is running, if any. */
  get running(): string | undefined {
    return this.#running;
  }

  /** The signal of the current run; model calls made during it are cancelled with it. */
  get signal(): AbortSignal | undefined {
    return this.#controller?.signal;
  }

  async run(flowId: string, input: unknown, options: RunOptions = {}): Promise<FlowResult> {
    if (this.#running) throw new Error(`"${this.#running}" is already running`);
    const flow = this.flows(flowId);
    const parsed = flow.input.safeParse(input);
    if (!parsed.success) throw new Error(`Invalid input for ${flowId}: ${parsed.error.message}`);
    const controller = new AbortController();
    this.#controller = controller;
    this.#running = flowId;
    await this.host.bus.emit(flowStarted.create({ flowId }));
    const counter = { steps: 0 };
    const ctx = this.#context(flowId, controller.signal, counter, options.maxSteps);
    const result = await flow.run(ctx, parsed.data).then(
      (): FlowResult => ({ outcome: 'paused', steps: counter.steps }),
      (error: unknown): FlowResult => classify(error, controller.signal, counter.steps),
    );
    this.#controller = undefined;
    this.#running = undefined;
    await this.host.bus.emit(flowEnded.create({ flowId, result }));
    return result;
  }

  /** Stops the current run: no further steps, model calls aborted, open human tasks cancelled. */
  async interrupt(): Promise<void> {
    if (!this.#controller) return;
    this.#controller.abort();
    for (const task of this.host.tasks.pending()) {
      await this.host.tasks.cancel(task.id, 'The run was interrupted');
    }
  }

  #context(
    flowId: string,
    signal: AbortSignal,
    counter: { steps: number },
    maxSteps = DEFAULT_MAX_STEPS,
  ): FlowContext {
    const step = <T>(work: () => Promise<T>): Promise<T> => {
      if (signal.aborted) return Promise.reject(new FlowStop('interrupted'));
      if (counter.steps >= maxSteps) return Promise.reject(new FlowStop('step-limit'));
      counter.steps++;
      return work();
    };
    const { host } = this;
    return {
      get actors() {
        return host.actors;
      },
      get steps() {
        return counter.steps;
      },
      signal,
      state: host.workspace.view(`flow:${flowId}`),
      transcript: () => host.transcript(),
      pickNext: () => host.pickNext(),
      runTurn: (actorId) => step(() => host.runTurn(actorId)),
      invoke: (actorId, contract, action, input) =>
        step(() => host.invoke(actorId, contract, action, input)),
    };
  }
}

function classify(error: unknown, signal: AbortSignal, steps: number): FlowResult {
  if (error instanceof FlowStop) return { outcome: error.outcome, steps };
  if (signal.aborted) return { outcome: 'interrupted', steps };
  return { outcome: 'failed', steps, error };
}
