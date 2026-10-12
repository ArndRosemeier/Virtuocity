import type { CompletionRequest } from '@virtuocity/core';
import { readStream } from './stream';
import type { Answer, WireImage, WireToolCall, WireUsage } from './wire';
import { fromWireCalls, fromWireImages } from './wire';

/** A chat completion answer when not streaming. */
interface ChatResponse {
  readonly model: string;
  readonly choices: readonly {
    readonly message: {
      readonly content: string | null;
      readonly tool_calls?: readonly WireToolCall[];
      readonly images?: readonly WireImage[];
    };
  }[];
  readonly usage?: WireUsage;
}

function fromResponse(body: ChatResponse): Answer {
  const message = body.choices[0]?.message;
  return {
    model: body.model,
    text: message?.content ?? '',
    toolCalls: fromWireCalls(message?.tool_calls),
    media: fromWireImages(message?.images),
    usage: body.usage,
  };
}

/** The answer of a chat completion, streamed to `onText` when the request asks for it. */
export async function readAnswer(response: Response, request: CompletionRequest): Promise<Answer> {
  if (request.onText && response.body) return readStream(response.body, request.onText);
  const answer = fromResponse((await response.json()) as ChatResponse);
  if (answer.text) request.onText?.(answer.text);
  return answer;
}

/** Posts JSON with the provider's headers, aborting with the request's signal. */
export function jsonPost(
  doFetch: typeof fetch,
  headers: Record<string, string>,
  request: CompletionRequest,
): (url: string, body: Record<string, unknown>) => Promise<Response> {
  return (url, body) =>
    doFetch(url, {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      ...(request.signal ? { signal: request.signal } : {}),
    });
}

/** Throws with the provider's name, the status and the error text unless the response is ok. */
export async function failUnlessOk(
  provider: string,
  response: Response,
  error?: string,
): Promise<void> {
  if (response.ok) return;
  const text = error ?? (await response.text());
  throw new Error(`${provider} request failed (${response.status}): ${text}`);
}
