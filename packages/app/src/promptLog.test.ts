import { describe, expect, it, vi } from 'vitest';
import { PromptLog, loggingFetch, pretty, shortenMedia } from './promptLog';

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

function setup(answer: () => Promise<Response>) {
  const log = new PromptLog(5);
  const inner = vi.fn(answer);
  let time = 1000;
  const doFetch = loggingFetch(log, inner as unknown as typeof fetch, () => (time += 250));
  return { log, inner, doFetch };
}

describe('prompt log', () => {
  it('records the sent body and the raw answer, but no headers', async () => {
    const { log, doFetch } = setup(() => Promise.resolve(new Response('{"ok":true}')));
    const response = await doFetch('https://api.example/chat', {
      method: 'POST',
      headers: { Authorization: 'Bearer secret' },
      body: '{"model":"m"}',
    });
    expect(await response.text()).toBe('{"ok":true}');
    await flush();
    const [entry] = log.list();
    expect(entry).toMatchObject({
      url: 'https://api.example/chat',
      request: '{"model":"m"}',
      status: 200,
      response: '{"ok":true}',
    });
    expect(JSON.stringify(entry)).not.toContain('secret');
  });

  it('keeps only the newest five, newest first', async () => {
    const { log, doFetch } = setup(() => Promise.resolve(new Response('x')));
    for (let i = 1; i <= 7; i++) await doFetch('u', { method: 'POST', body: String(i) });
    expect(log.list().map((e) => e.request)).toEqual(['7', '6', '5', '4', '3']);
  });

  it('leaves calls without a body (model catalogs) out', async () => {
    const { log, inner, doFetch } = setup(() => Promise.resolve(new Response('[]')));
    await doFetch('https://api.example/models');
    expect(inner).toHaveBeenCalledOnce();
    expect(log.list()).toEqual([]);
  });

  it('records a failed call and still throws', async () => {
    const { log, doFetch } = setup(() => Promise.reject(new Error('offline')));
    await expect(doFetch('u', { method: 'POST', body: 'b' })).rejects.toThrow('offline');
    expect(log.list()[0]?.error).toContain('offline');
  });

  it('shortens embedded pictures and pretty-prints JSON', () => {
    const picture = `data:image/png;base64,${'A'.repeat(4096)}`;
    expect(shortenMedia(`{"url":"${picture}"}`)).toBe('{"url":"data:image/png;base64,…(4 KB)"}');
    expect(pretty('{"a":1}')).toBe('{\n  "a": 1\n}');
    expect(pretty('data: not json')).toBe('data: not json');
  });
});
