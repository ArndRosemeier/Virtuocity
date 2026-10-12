import { describe, expect, it, vi } from 'vitest';
import { createOpenRouterProvider } from './index';
import { fetchModels, toModelInfo } from './models';

describe('OpenRouter model catalog', () => {
  it('maps modalities and converts per-token prices to per-million', () => {
    expect(
      toModelInfo({
        id: 'x/img',
        name: 'Img',
        context_length: 8000,
        architecture: { input_modalities: ['text', 'image'], output_modalities: ['image', 'text'] },
        pricing: { prompt: '0.000003', completion: '0.000015' },
      }),
    ).toEqual({
      id: 'x/img',
      name: 'Img',
      inputs: ['text', 'image'],
      outputs: ['image', 'text'],
      contextLength: 8000,
      pricing: { prompt: 3, completion: 15 },
    });
  });

  it('treats a missing architecture as text and drops unknown prices', () => {
    const info = toModelInfo({ id: 'a', name: 'A', pricing: { prompt: '-1', completion: '0' } });
    expect(info.outputs).toEqual(['text']);
    expect(info.pricing).toBeUndefined();
  });

  it('asks for every output modality and follows pages', async () => {
    const page = (n: number, start: number) => ({
      data: Array.from({ length: n }, (_, i) => ({ id: `m${start + i}`, name: 'M' })),
    });
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response(JSON.stringify(page(1000, 0))))
      .mockResolvedValueOnce(new Response(JSON.stringify(page(3, 1000))));
    const models = await fetchModels(fetchMock);
    expect(models).toHaveLength(1003);
    expect(fetchMock.mock.calls.map((c) => String(c[0]))).toEqual([
      'https://openrouter.ai/api/v1/models?output_modalities=all&limit=1000&offset=0',
      'https://openrouter.ai/api/v1/models?output_modalities=all&limit=1000&offset=1000',
    ]);
  });

  it('fetches the catalog once and retries after a failure', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response('down', { status: 503 }))
      .mockResolvedValue(new Response(JSON.stringify({ data: [{ id: 'm', name: 'M' }] })));
    const provider = createOpenRouterProvider({ apiKey: () => '', fetch: fetchMock });
    await expect(provider.listModels?.()).rejects.toThrow(/503/);
    expect((await provider.listModels?.())?.map((m) => m.id)).toEqual(['m']);
    await provider.listModels?.();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
