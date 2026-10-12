import { describe, expect, it, vi } from 'vitest';
import { createOpenRouterProvider } from './index';

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
    const init = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(init[1].headers).toMatchObject({ Authorization: 'Bearer k' });
  });

  it('throws on HTTP errors', async () => {
    const fetchMock = vi.fn(() => Promise.resolve(new Response('nope', { status: 401 })));
    const provider = createOpenRouterProvider({ apiKey: () => 'k', fetch: fetchMock });
    await expect(provider.complete({ modality: 'text', model: 'm', messages: [] })).rejects.toThrow(
      /401/,
    );
  });
});
