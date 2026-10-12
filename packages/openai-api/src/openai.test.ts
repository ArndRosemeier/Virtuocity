import { describe, expect, it, vi } from 'vitest';
import { createOpenAIProvider, openAIModelInfo } from './openai';

function fakeOpenAI(answer: unknown) {
  const sent: { url: string; body: Record<string, unknown> }[] = [];
  const fetchMock = vi.fn((url: string, init?: RequestInit) => {
    sent.push({ url, body: JSON.parse(String(init?.body ?? '{}')) as Record<string, unknown> });
    return Promise.resolve(new Response(JSON.stringify(answer)));
  });
  const fetch = fetchMock as unknown as typeof globalThis.fetch;
  return { provider: createOpenAIProvider({ apiKey: () => 'k', fetch }), sent };
}

describe('OpenAI provider', () => {
  it('sends chat requests without OpenRouter-only fields', async () => {
    const { provider, sent } = fakeOpenAI({
      model: 'gpt-x',
      choices: [{ message: { content: 'Hi' } }],
      usage: { prompt_tokens: 3, completion_tokens: 1 },
    });
    const result = await provider.complete({
      modality: 'text',
      model: 'gpt-x',
      messages: [{ role: 'user', content: 'Hello' }],
    });
    expect(result).toEqual({
      text: 'Hi',
      stats: { model: 'gpt-x', promptTokens: 3, completionTokens: 1 },
    });
    expect(sent[0]?.url).toBe('https://api.openai.com/v1/chat/completions');
    expect(sent[0]?.body).not.toHaveProperty('usage');
  });

  it('draws pictures on the images endpoint', async () => {
    const { provider, sent } = fakeOpenAI({
      data: [{ b64_json: btoa('PNG') }],
      usage: { input_tokens: 5, output_tokens: 100 },
    });
    const result = await provider.complete({
      modality: 'image',
      model: 'dall-e-3',
      messages: [{ role: 'user', content: 'A lantern' }],
    });
    expect(result.media?.[0]?.mime).toBe('image/png');
    expect(result.stats).toMatchObject({ promptTokens: 5, completionTokens: 100 });
    expect(sent[0]?.body).toEqual({
      model: 'dall-e-3',
      prompt: 'A lantern',
      n: 1,
      response_format: 'b64_json',
    });
  });

  it('reads the kind of model from its id', () => {
    expect(openAIModelInfo('gpt-image-1')?.outputs).toEqual(['image']);
    expect(openAIModelInfo('gpt-5')?.outputs).toEqual(['text']);
    expect(openAIModelInfo('o4-mini')?.outputs).toEqual(['text']);
    expect(openAIModelInfo('text-embedding-3-large')).toBeUndefined();
    expect(openAIModelInfo('gpt-4o-realtime-preview')).toBeUndefined();
  });
});
