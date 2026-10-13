import type { DecisionAnswer, DecisionRequest, DecisionResult } from '@virtuocity/core';
import { failUnlessOk } from './http';

export const DECISIONS_ENDPOINT = 'https://openrouter.ai/api/alpha/decisions';

/** OpenRouter's answer to a decisions request. */
interface DecisionsResponse {
  readonly model: string;
  readonly answers: Readonly<Record<string, DecisionAnswer>>;
  readonly usage?: {
    readonly input_tokens?: number;
    readonly output_tokens?: number;
    readonly cost?: number;
  };
}

/** Asks a decision model (e.g. `typesafe/jev-1.13`) through OpenRouter's Decisions API. */
export async function decide(
  doFetch: typeof fetch,
  headers: Record<string, string>,
  request: DecisionRequest,
): Promise<DecisionResult> {
  const { model, state, questions, signal } = request;
  const response = await doFetch(DECISIONS_ENDPOINT, {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, state, questions }),
    ...(signal ? { signal } : {}),
  });
  await failUnlessOk('OpenRouter', response);
  const body = (await response.json()) as DecisionsResponse;
  return {
    answers: body.answers,
    stats: {
      model: body.model,
      promptTokens: body.usage?.input_tokens ?? 0,
      completionTokens: body.usage?.output_tokens ?? 0,
      costUsd: body.usage?.cost,
    },
  };
}
