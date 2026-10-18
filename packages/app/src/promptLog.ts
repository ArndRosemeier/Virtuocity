/** One model call as it went over the wire: what was sent and what came back, unparsed. */
export interface PromptLogEntry {
  readonly id: number;
  readonly at: number;
  readonly url: string;
  /** The request body exactly as sent. Headers (and so API keys) are never kept. */
  readonly request: string;
  /** HTTP status, or undefined while waiting or when the call failed before an answer. */
  readonly status?: number;
  /** The raw response text (for streamed answers, the whole stream), once it is complete. */
  readonly response?: string;
  readonly error?: string;
  readonly ms?: number;
}

/** How many calls the log keeps; older ones drop out. */
export const PROMPT_LOG_SIZE = 5;

/** An always-on, in-memory log of the last few model calls. */
export class PromptLog {
  private entries: readonly PromptLogEntry[] = [];
  private readonly listeners = new Set<() => void>();
  private nextId = 1;

  constructor(private readonly size = PROMPT_LOG_SIZE) {}

  /** Newest first. */
  list = (): readonly PromptLogEntry[] => this.entries;

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  add(entry: Omit<PromptLogEntry, 'id'>): number {
    const id = this.nextId++;
    this.entries = [{ ...entry, id }, ...this.entries].slice(0, this.size);
    this.emit();
    return id;
  }

  update(id: number, change: Partial<Omit<PromptLogEntry, 'id'>>): void {
    if (!this.entries.some((e) => e.id === id)) return;
    this.entries = this.entries.map((e) => (e.id === id ? { ...e, ...change } : e));
    this.emit();
  }

  private emit(): void {
    for (const listener of this.listeners) listener();
  }
}

function urlOf(input: Parameters<typeof fetch>[0]): string {
  if (typeof input === 'string') return input;
  return input instanceof URL ? input.href : input.url;
}

function bodyOf(init: RequestInit | undefined): string | undefined {
  const body = init?.body;
  if (body === undefined || body === null) return undefined;
  return typeof body === 'string' ? body : `[${Object.prototype.toString.call(body)}]`;
}

/**
 * A fetch that records every call carrying a body (model calls; catalog GETs
 * are left out) in the log, without touching what the caller receives.
 */
export function loggingFetch(
  log: PromptLog,
  doFetch: typeof fetch,
  now: () => number,
): typeof fetch {
  return async (input, init) => {
    const request = bodyOf(init);
    if (request === undefined) return doFetch(input, init);
    const start = now();
    const id = log.add({ at: start, url: urlOf(input), request });
    try {
      const response = await doFetch(input, init);
      log.update(id, { status: response.status });
      void response
        .clone()
        .text()
        .then(
          (text) => log.update(id, { response: text, ms: now() - start }),
          (error: unknown) => log.update(id, { error: String(error), ms: now() - start }),
        );
      return response;
    } catch (error) {
      log.update(id, { error: String(error), ms: now() - start });
      throw error;
    }
  };
}

const DATA_URL = /data:([\w/+.-]+);base64,[A-Za-z0-9+/=]{200,}/g;
const BASE64_FIELD = /"(b64_json|data)":\s*"[A-Za-z0-9+/=]{200,}"/g;

/** Shortens embedded pictures so the text stays readable; everything else stays raw. */
export function shortenMedia(text: string): string {
  return text
    .replace(
      DATA_URL,
      (m, mime: string) => `data:${mime};base64,…(${Math.round(m.length / 1024)} KB)`,
    )
    .replace(
      BASE64_FIELD,
      (m, key: string) => `"${key}": "…(${Math.round(m.length / 1024)} KB base64)"`,
    );
}

/** The text pretty-printed when it is JSON, else as it is. */
export function pretty(text: string): string {
  try {
    return JSON.stringify(JSON.parse(text), null, 2);
  } catch {
    return text;
  }
}

/** The app's one prompt log. */
export const promptLog = new PromptLog();
