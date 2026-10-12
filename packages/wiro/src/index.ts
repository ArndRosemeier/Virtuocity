import type {
  CompletionRequest,
  CompletionResult,
  GeneratedMedia,
  ModelInfo,
  ModelProvider,
  ProviderOptions,
  VirtuocityModule,
} from '@virtuocity/core';
import { cachedCatalog, promptText } from '@virtuocity/core';

const API = 'https://api.wiro.ai/v1';
const NAME = 'WIRO';
/** How often a running task is checked, and for how long at most. */
const POLL_MS = 2000;
const MAX_POLLS = 300;

export interface WiroOptions extends ProviderOptions {
  /** Waits between status checks; injected so tests need not wait. */
  readonly sleep?: (ms: number, signal?: AbortSignal) => Promise<void>;
}

interface WiroError {
  readonly message?: string;
}

interface RunResponse {
  readonly result?: boolean;
  readonly errors?: readonly WiroError[];
  readonly taskid?: string;
}

export interface WiroTask {
  readonly status?: string;
  readonly pexit?: string;
  readonly totalcost?: string;
  readonly outputs?: readonly { readonly url?: string; readonly contenttype?: string }[];
}

interface DetailResponse {
  readonly errors?: readonly WiroError[];
  readonly tasklist?: readonly WiroTask[];
}

interface WiroTool {
  readonly title?: string;
  readonly description?: string;
  readonly cleanslugowner?: string;
  readonly cleanslugproject?: string;
}

/** Finished, with or without success; `task_end` comes before post-processing, so it is not one. */
const FINISHED = new Set(['task_postprocess_end', 'task_cancel']);

function errorText(errors: readonly WiroError[] | undefined): string {
  return (errors ?? []).map((e) => e.message ?? '').join('; ') || 'unknown error';
}

/** A finished task's outcome: its picture links, or why it failed. */
export function taskOutcome(task: WiroTask): readonly string[] {
  if (task.status !== 'task_postprocess_end' || task.pexit !== '0')
    throw new Error(`WIRO task failed (${task.status ?? 'no status'}, exit ${task.pexit ?? '?'})`);
  const urls = (task.outputs ?? []).flatMap((o) => (o.url ? [o.url] : []));
  if (urls.length === 0) throw new Error('WIRO task finished without output');
  return urls;
}

export function toModelInfo(tool: WiroTool): ModelInfo | undefined {
  if (!tool.cleanslugowner || !tool.cleanslugproject) return undefined;
  const id = `${tool.cleanslugowner}/${tool.cleanslugproject}`;
  return {
    id,
    name: tool.title ?? id,
    outputs: ['image'],
    inputs: ['text'],
    ...(tool.description ? { description: tool.description } : {}),
  };
}

const wait = (ms: number, signal?: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener('abort', () => {
      clearTimeout(timer);
      reject(signal.reason instanceof Error ? signal.reason : new Error('Aborted'));
    });
  });

/** WIRO's API calls: posting with the key, waiting for a task, fetching its pictures. */
function wiroClient(options: WiroOptions) {
  const doFetch = options.fetch ?? globalThis.fetch.bind(globalThis);
  const sleep = options.sleep ?? wait;
  const post = async <T>(path: string, body: unknown, signal?: AbortSignal): Promise<T> => {
    const response = await doFetch(`${API}/${path}`, {
      method: 'POST',
      headers: { 'x-api-key': options.apiKey(), 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      ...(signal ? { signal } : {}),
    });
    if (!response.ok)
      throw new Error(`${NAME} request failed (${response.status}): ${await response.text()}`);
    return (await response.json()) as T;
  };
  const finished = async (taskid: string, signal?: AbortSignal): Promise<WiroTask> => {
    for (let poll = 0; poll < MAX_POLLS; poll++) {
      const detail = await post<DetailResponse>('Task/Detail', { taskid }, signal);
      const task = detail.tasklist?.[0];
      if (!task) throw new Error(`${NAME} task not found: ${errorText(detail.errors)}`);
      if (task.status && FINISHED.has(task.status)) return task;
      await sleep(POLL_MS, signal);
    }
    throw new Error(`${NAME} task did not finish in time`);
  };
  const download = async (url: string, signal?: AbortSignal): Promise<GeneratedMedia> => {
    const response = await doFetch(url, signal ? { signal } : {});
    if (!response.ok) throw new Error(`Could not fetch the WIRO picture (${response.status})`);
    const mime = response.headers.get('content-type') ?? 'image/png';
    return { mime, bytes: new Uint8Array(await response.arrayBuffer()) };
  };
  return { post, finished, download };
}

/** WIRO's image models: a task is started, checked until it finishes, then its pictures fetched. */
export function createWiroProvider(options: WiroOptions): ModelProvider {
  const { post, finished, download } = wiroClient(options);
  const listModels = cachedCatalog(async () => {
    const body = await post<{ readonly tool?: readonly WiroTool[] }>('Tool/List', {
      categories: ['text-to-image'],
      limit: 1000,
      start: 0,
    });
    return (body.tool ?? []).map(toModelInfo).filter((m): m is ModelInfo => m !== undefined);
  });
  return {
    id: 'wiro',
    name: NAME,
    ready: () => options.apiKey() !== '',
    listModels,
    async complete(request: CompletionRequest): Promise<CompletionResult> {
      const { signal } = request;
      const prompt = promptText(request.messages);
      const run = await post<RunResponse>(`Run/${request.model}`, { prompt }, signal);
      if (!run.result || !run.taskid)
        throw new Error(`${NAME} could not start the task: ${errorText(run.errors)}`);
      const task = await finished(run.taskid, signal);
      const media = await Promise.all(taskOutcome(task).map((url) => download(url, signal)));
      const cost = Number(task.totalcost);
      return {
        text: '',
        media,
        stats: {
          model: request.model,
          promptTokens: 0,
          completionTokens: 0,
          ...(Number.isFinite(cost) && task.totalcost !== undefined ? { costUsd: cost } : {}),
        },
      };
    },
  };
}

export function wiroModule(options: WiroOptions): VirtuocityModule {
  return {
    id: 'wiro',
    register: (host) => host.providers.register(createWiroProvider(options)),
  };
}
