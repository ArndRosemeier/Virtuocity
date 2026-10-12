import { describe, expect, it, vi } from 'vitest';
import { createWiroProvider, taskOutcome, toModelInfo } from './index';

const PROXY = 'https://proxy.example';
const json = (body: unknown) => new Response(JSON.stringify(body));

function fakeWiro(statuses: readonly string[]) {
  let polls = 0;
  const sent: { url: string; body: unknown }[] = [];
  const fetchMock = vi.fn((proxied: string, init?: RequestInit) => {
    expect(proxied.startsWith(`${PROXY}?url=`)).toBe(true);
    const url = decodeURIComponent(proxied.slice(`${PROXY}?url=`.length));
    sent.push({ url, body: init?.body ? JSON.parse(String(init.body)) : undefined });
    if (url.endsWith('/Run/google/nano-banana'))
      return Promise.resolve(json({ result: true, taskid: '42', errors: [] }));
    if (url.endsWith('/Task/Detail')) {
      const status = statuses[Math.min(polls++, statuses.length - 1)];
      const outputs = [{ url: 'https://cdn.wiro.ai/out.png' }];
      return Promise.resolve(
        json({ tasklist: [{ status, pexit: '0', outputs, totalcost: '0.03' }] }),
      );
    }
    const headers = { 'content-type': 'image/png' };
    return Promise.resolve(new Response(new Uint8Array([1, 2, 3]), { headers }));
  });
  const sleep = vi.fn(() => Promise.resolve());
  const fetch = fetchMock as unknown as typeof globalThis.fetch;
  return {
    provider: createWiroProvider({ apiKey: () => 'k', proxy: () => PROXY, fetch, sleep }),
    sent,
    sleep,
  };
}

describe('WIRO provider', () => {
  it('starts a task, waits for it and returns its picture with the cost', async () => {
    const { provider, sent, sleep } = fakeWiro(['task_queue', 'task_end', 'task_postprocess_end']);
    const result = await provider.complete({
      modality: 'image',
      model: 'google/nano-banana',
      messages: [{ role: 'user', content: 'A lantern' }],
    });
    expect(result.media).toEqual([{ mime: 'image/png', bytes: new Uint8Array([1, 2, 3]) }]);
    expect(result.stats).toEqual({
      model: 'google/nano-banana',
      promptTokens: 0,
      completionTokens: 0,
      costUsd: 0.03,
    });
    expect(sent[0]?.body).toEqual({ prompt: 'A lantern' });
    expect(sent[1]?.body).toEqual({ taskid: '42' });
    expect(sleep).toHaveBeenCalledTimes(2);
  });

  it('is ready only with a key and a proxy', () => {
    expect(createWiroProvider({ apiKey: () => 'k', proxy: () => '' }).ready()).toBe(false);
    expect(createWiroProvider({ apiKey: () => 'k', proxy: () => PROXY }).ready()).toBe(true);
  });

  it('fails a task that did not exit cleanly', () => {
    expect(() => taskOutcome({ status: 'task_postprocess_end', pexit: '1' })).toThrow(/failed/);
    expect(() => taskOutcome({ status: 'task_cancel' })).toThrow(/failed/);
  });

  it('names models by their clean slugs', () => {
    expect(
      toModelInfo({
        title: 'Nano Banana',
        cleanslugowner: 'google',
        cleanslugproject: 'nano-banana',
      }),
    ).toEqual({
      id: 'google/nano-banana',
      name: 'Nano Banana',
      outputs: ['image'],
      inputs: ['text'],
    });
    expect(toModelInfo({ title: 'Broken' })).toBeUndefined();
  });
});
