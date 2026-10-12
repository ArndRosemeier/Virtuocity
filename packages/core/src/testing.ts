import type { CompletionRequest, CompletionResult, ModelProvider } from './provider';

/** Recorded model calls, keyed by the request that produced them. */
export interface Recording {
  readonly calls: Record<string, CompletionResult>;
}

/** Stable key for a request: modality, model and messages. */
export function requestKey(request: CompletionRequest): string {
  const { modality, model, messages } = request;
  return JSON.stringify({ modality, model, messages });
}

/** Wraps a real provider and records every result into `recording`. */
export function recordingProvider(inner: ModelProvider, recording: Recording): ModelProvider {
  return {
    id: inner.id,
    complete: async (request) => {
      const result = await inner.complete(request);
      recording.calls[requestKey(request)] = result;
      return result;
    },
  };
}

/** Plays back a recording; an unrecorded request fails loudly instead of calling a model. */
export function replayProvider(recording: Recording, id = 'replay'): ModelProvider {
  return {
    id,
    complete: (request) => {
      const key = requestKey(request);
      const result = Object.hasOwn(recording.calls, key) ? recording.calls[key] : undefined;
      if (!result) return Promise.reject(new Error(`No recorded response for request ${key}`));
      return Promise.resolve(result);
    },
  };
}

/** Answers with fixed texts in order (or computed from the request), with zero-cost stats. */
export function scriptedProvider(
  replies: readonly string[] | ((request: CompletionRequest) => string),
  id = 'scripted',
): ModelProvider {
  let index = 0;
  const next = (request: CompletionRequest): string => {
    if (typeof replies === 'function') return replies(request);
    const reply = replies[index++];
    if (reply === undefined) throw new Error(`Scripted provider ran out of replies`);
    return reply;
  };
  return {
    id,
    complete: (request) =>
      Promise.resolve().then(() => ({
        text: next(request),
        stats: { model: request.model, promptTokens: 0, completionTokens: 0, costUsd: 0 },
      })),
  };
}
