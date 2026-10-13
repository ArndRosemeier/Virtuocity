import { describe, expect, it, vi } from 'vitest';
import { createOpenRouterProvider } from './openrouter';

describe('OpenRouter provider', () => {
  it('sends the request and maps text and usage stats', async () => {
    const fetchMock = vi.fn(() =>
      Promise.resolve(
        new Response(
          JSON.stringify({
            model: 'x/model',
            choices: [{ message: { content: 'Hello' } }],
            usage: { prompt_tokens: 12, completion_tokens: 3, cost: 0.0004 },
          }),
        ),
      ),
    );
    const provider = createOpenRouterProvider({ apiKey: () => 'k', fetch: fetchMock });
    const result = await provider.complete({
      modality: 'text',
      model: 'x/model',
      messages: [{ role: 'user', content: 'Hi' }],
    });
    expect(result).toEqual({
      text: 'Hello',
      stats: { model: 'x/model', promptTokens: 12, completionTokens: 3, costUsd: 0.0004 },
    });
    const calls = fetchMock.mock.calls as unknown as [string, RequestInit][];
    const init = calls.find(([url]) => url.includes('/chat/'));
    expect(init?.[1].headers).toMatchObject({ Authorization: 'Bearer k' });
  });

  it('asks decision models through the Decisions API', async () => {
    const answers = { next: { type: 'choice', choice: 'Mira', confidence: 0.8 } };
    const fetchMock = vi.fn(() =>
      Promise.resolve(
        new Response(
          JSON.stringify({
            model: 'typesafe/jev-1.13-20260917',
            answers,
            usage: { input_tokens: 40, output_tokens: 5, cost: 0.00002 },
          }),
        ),
      ),
    );
    const provider = createOpenRouterProvider({ apiKey: () => 'k', fetch: fetchMock });
    const questions = {
      next: { type: 'choice' as const, instructions: 'Who?', criteria: { Mira: '', You: '' } },
    };
    const result = await provider.decide?.({ model: 'typesafe/jev-1.13', state: 'x', questions });
    expect(result).toEqual({
      answers,
      stats: {
        model: 'typesafe/jev-1.13-20260917',
        promptTokens: 40,
        completionTokens: 5,
        costUsd: 0.00002,
      },
    });
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('https://openrouter.ai/api/alpha/decisions');
    expect(JSON.parse(String(init.body))).toEqual({
      model: 'typesafe/jev-1.13',
      state: 'x',
      questions,
    });
  });

  it('throws on HTTP errors', async () => {
    const fetchMock = vi.fn(() => Promise.resolve(new Response('nope', { status: 401 })));
    const provider = createOpenRouterProvider({ apiKey: () => 'k', fetch: fetchMock });
    await expect(provider.complete({ modality: 'text', model: 'm', messages: [] })).rejects.toThrow(
      /401/,
    );
  });
});
