import { defineEvent } from './events';
import type { EventBus } from './events';
import type { CompletionRequest, CompletionResult, ToolCall } from './provider';
import type { CallStats } from './stats';

export type CallStatus = 'running' | 'done' | 'failed' | 'cancelled';

/** Everything about one model call, for live display and debugging. */
export interface CallTrace {
  readonly id: string;
  readonly actorId: string;
  readonly skillId: string;
  readonly request: Omit<CompletionRequest, 'signal' | 'onText'>;
  readonly startedAt: number;
  readonly status: CallStatus;
  /** The text so far while running; the full answer when done. */
  readonly text: string;
  readonly toolCalls?: readonly ToolCall[];
  readonly stats?: CallStats;
  readonly error?: string;
  readonly endedAt?: number;
}

export const callStarted = defineEvent<{ readonly callId: string }>('call.started');
/** Fired as text streams in; read the text from `CallLog.get`. */
export const callProgressed = defineEvent<{ readonly callId: string }>('call.progressed');
export const callEnded = defineEvent<{ readonly callId: string; readonly status: CallStatus }>(
  'call.ended',
);

export interface CallLogOptions {
  readonly bus: EventBus;
  readonly newId: () => string;
  readonly now: () => number;
  /** How many finished calls to keep. Default 200. */
  readonly limit?: number;
}

export interface CallMeta {
  readonly actorId: string;
  readonly skillId: string;
}

/** Traces of recent model calls. Kept in memory only; they can hold whole prompts. */
export class CallLog {
  readonly #traces = new Map<string, CallTrace>();

  constructor(private readonly options: CallLogOptions) {}

  get(id: string): CallTrace | undefined {
    return this.#traces.get(id);
  }

  /** Oldest first. */
  list(): readonly CallTrace[] {
    return [...this.#traces.values()];
  }

  running(actorId?: string): readonly CallTrace[] {
    return this.list().filter(
      (t) => t.status === 'running' && (actorId === undefined || t.actorId === actorId),
    );
  }

  /** Runs a call, recording its request, streamed text, result or failure. */
  async track(
    meta: CallMeta,
    request: CompletionRequest,
    run: (request: CompletionRequest) => Promise<CompletionResult>,
  ): Promise<CompletionResult> {
    const id = this.options.newId();
    const { onText } = request;
    this.#set({
      id,
      ...meta,
      request: traced(request),
      startedAt: this.options.now(),
      status: 'running',
      text: '',
    });
    await this.#emit(callStarted.create({ callId: id }));
    const streamed = (delta: string) => {
      onText?.(delta);
      this.#update(id, (t) => ({ ...t, text: t.text + delta }));
      void this.#emit(callProgressed.create({ callId: id }));
    };
    try {
      const result = await run({ ...request, onText: streamed });
      this.#finish(id, {
        status: 'done',
        text: result.text,
        stats: result.stats,
        ...withCalls(result),
      });
      return result;
    } catch (error) {
      const status = request.signal?.aborted ? 'cancelled' : 'failed';
      this.#finish(id, { status, error: String(error) });
      throw error;
    } finally {
      await this.#emit(callEnded.create({ callId: id, status: this.#status(id) }));
    }
  }

  #status(id: string): CallStatus {
    return this.#traces.get(id)?.status ?? 'failed';
  }

  #set(trace: CallTrace): void {
    this.#traces.set(trace.id, trace);
  }

  #update(id: string, change: (trace: CallTrace) => CallTrace): void {
    const trace = this.#traces.get(id);
    if (trace) this.#set(change(trace));
  }

  #finish(id: string, end: Partial<CallTrace>): void {
    this.#update(id, (t) => ({ ...t, ...end, endedAt: this.options.now() }));
    const limit = this.options.limit ?? 200;
    const finished = this.list().filter((t) => t.status !== 'running');
    for (const old of finished.slice(0, Math.max(0, finished.length - limit))) {
      this.#traces.delete(old.id);
    }
  }

  #emit(event: Parameters<EventBus['emit']>[0]): Promise<void> {
    return this.options.bus.emit(event);
  }
}

function withCalls(result: CompletionResult): Partial<CallTrace> {
  return result.toolCalls?.length ? { toolCalls: result.toolCalls } : {};
}

/** The request as stored in a trace: without the signal and streaming callback. */
function traced(request: CompletionRequest): CallTrace['request'] {
  const copy: { -readonly [K in keyof CompletionRequest]?: CompletionRequest[K] } = { ...request };
  delete copy.signal;
  delete copy.onText;
  return { ...copy, modality: request.modality, model: request.model, messages: request.messages };
}
