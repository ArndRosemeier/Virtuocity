import { describe, expect, it, vi } from 'vitest';
import { IMAGES_ENDPOINT } from './images';
import { createOpenRouterProvider } from './index';

const NOT_CHAT = JSON.stringify({
  error: {
    message:
      'meta/muse-image is an image generation model and cannot be used with the chat/completions endpoint. Use the /api/v1/images endpoint instead.',
    code: 404,
  },
});

const PICTURE = JSON.stringify({
  data: [{ b64_json: btoa('PNG'), media_type: 'image/png' }],
  usage: { prompt_tokens: 0, completion_tokens: 4175, cost: 0.04 },
});

const CATALOG = JSON.stringify({
  data: [{ id: 'meta/muse-image', name: 'Muse', architecture: { output_modalities: ['image'] } }],
});

function answer(url: string): Response {
  if (url === IMAGES_ENDPOINT) return new Response(PICTURE);
  if (url.includes('/models')) return new Response(CATALOG);
  return new Response(NOT_CHAT, { status: 404 });
}

function provider() {
  const fetchMock = vi.fn((url: string) => Promise.resolve(answer(url)));
  const fetch = fetchMock as unknown as typeof globalThis.fetch;
  return { fetchMock, provider: createOpenRouterProvider({ apiKey: () => 'k', fetch }) };
}

const request = {
  modality: 'image' as const,
  model: 'meta/muse-image',
  messages: [{ role: 'user' as const, content: 'A lantern on a stone wall' }],
};

describe('image-only models', () => {
  it('are sent to the images endpoint when chat completions turns them away', async () => {
    const { fetchMock, provider: openRouter } = provider();
    const result = await openRouter.complete(request);
    expect(result.media).toEqual([{ mime: 'image/png', bytes: new TextEncoder().encode('PNG') }]);
    expect(result.stats).toEqual({
      model: 'meta/muse-image',
      promptTokens: 0,
      completionTokens: 4175,
      costUsd: 0.04,
    });
    const call = fetchMock.mock.calls.find(([url]) => url === IMAGES_ENDPOINT);
    const [, init] = call as unknown as [string, RequestInit];
    expect(JSON.parse(String(init.body))).toEqual({
      model: 'meta/muse-image',
      prompt: 'A lantern on a stone wall',
      n: 1,
    });
  });

  it('go straight to the images endpoint the next time', async () => {
    const { fetchMock, provider: openRouter } = provider();
    await openRouter.complete(request);
    await openRouter.complete(request);
    const posted = fetchMock.mock.calls.map(([url]) => url).filter((u) => !u.includes('/models'));
    expect(posted).toEqual([
      'https://openrouter.ai/api/v1/chat/completions',
      IMAGES_ENDPOINT,
      IMAGES_ENDPOINT,
    ]);
  });
});
