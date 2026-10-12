import type { GeneratedMedia } from './media';
import type { CompletionRequest, CompletionResult, ModelProvider, ToolCall } from './provider';

/** Recorded model calls, keyed by the request that produced them. */
export interface Recording {
  readonly calls: Record<string, CompletionResult>;
}

/** Stable key for a request: everything but the signal and the streaming callback. */
export function requestKey(request: CompletionRequest): string {
  const { modality, model, messages, tools, toolChoice, responseSchema } = request;
  return JSON.stringify({ modality, model, messages, tools, toolChoice, responseSchema });
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

/** A scripted answer: plain text, or text with tool calls or media. */
export type ScriptedReply =
  | string
  | {
      readonly text?: string;
      readonly toolCalls?: readonly ToolCall[];
      readonly media?: readonly GeneratedMedia[];
    };

/**
 * Answers with fixed replies in order (or computed from the request), with
 * zero-cost stats. Text is streamed word by word to `onText`.
 */
export function scriptedProvider(
  replies: readonly ScriptedReply[] | ((request: CompletionRequest) => ScriptedReply),
  id = 'scripted',
): ModelProvider {
  let index = 0;
  const next = (request: CompletionRequest): ScriptedReply => {
    if (typeof replies === 'function') return replies(request);
    const reply = replies[index++];
    if (reply === undefined) throw new Error(`Scripted provider ran out of replies`);
    return reply;
  };
  return {
    id,
    complete: (request) =>
      Promise.resolve().then(() => {
        const reply = next(request);
        const { text = '', toolCalls, media } = typeof reply === 'string' ? { text: reply } : reply;
        for (const word of text.match(/\S+\s*/g) ?? []) request.onText?.(word);
        return {
          text,
          ...(toolCalls ? { toolCalls } : {}),
          ...(media ? { media } : {}),
          stats: { model: request.model, promptTokens: 0, completionTokens: 0, costUsd: 0 },
        };
      }),
  };
}
