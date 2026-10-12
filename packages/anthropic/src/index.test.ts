import { describe, expect, it, vi } from 'vitest';
import { createAnthropicProvider, toMessages, toParams } from './index';

const sse = (events: readonly Record<string, unknown>[]) =>
  events.map((e) => `event: ${String(e.type)}\ndata: ${JSON.stringify(e)}\n\n`).join('');

const STREAM = sse([
  {
    type: 'message_start',
    message: {
      id: 'msg_1',
      type: 'message',
      role: 'assistant',
      model: 'claude-test',
      content: [],
      stop_reason: null,
      usage: { input_tokens: 10, output_tokens: 0 },
    },
  },
  { type: 'content_block_start', index: 0, content_block: { type: 'text', text: '' } },
  { type: 'content_block_delta', index: 0, delta: { type: 'text_delta', text: 'Hel' } },
  { type: 'content_block_delta', index: 0, delta: { type: 'text_delta', text: 'lo' } },
  { type: 'content_block_stop', index: 0 },
  { type: 'message_delta', delta: { stop_reason: 'end_turn' }, usage: { output_tokens: 4 } },
  { type: 'message_stop' },
]);

const MODELS = JSON.stringify({
  data: [
    {
      id: 'claude-test',
      display_name: 'Claude Test',
      type: 'model',
      created_at: '2026-01-01T00:00:00Z',
      max_input_tokens: 1000000,
      max_tokens: 128000,
    },
  ],
  has_more: false,
  first_id: 'claude-test',
  last_id: 'claude-test',
});

function fakeFetch() {
  const sent: { url: string; init: RequestInit }[] = [];
  const fetchMock = vi.fn((url: string | URL | Request, init?: RequestInit) => {
    const href = url instanceof Request ? url.url : String(url);
    sent.push({ url: href, init: init ?? {} });
    if (href.includes('/v1/models'))
      return Promise.resolve(
        new Response(MODELS, { headers: { 'content-type': 'application/json' } }),
      );
    const headers = { 'content-type': 'text/event-stream' };
    return Promise.resolve(new Response(STREAM, { headers }));
  });
  return { fetch: fetchMock as unknown as typeof fetch, sent };
}

describe('Anthropic provider', () => {
  it('lists models with their context window', async () => {
    const provider = createAnthropicProvider({ apiKey: () => 'k', fetch: fakeFetch().fetch });
    expect(await provider.listModels?.()).toEqual([
      expect.objectContaining({ id: 'claude-test', name: 'Claude Test', contextLength: 1000000 }),
    ]);
  });

  it('streams text, reports tokens and sends the browser header', async () => {
    const { fetch, sent } = fakeFetch();
    const provider = createAnthropicProvider({ apiKey: () => 'k', fetch });
    const seen: string[] = [];
    const result = await provider.complete({
      modality: 'text',
      model: 'claude-test',
      messages: [
        { role: 'system', content: 'Be brief.' },
        { role: 'user', content: 'Hi' },
      ],
      onText: (d) => seen.push(d),
    });
    expect(seen).toEqual(['Hel', 'lo']);
    expect(result).toEqual({
      text: 'Hello',
      stats: { model: 'claude-test', promptTokens: 10, completionTokens: 4 },
    });
    const call = sent.find((s) => s.url.includes('/v1/messages'));
    const headers = new Headers(call?.init.headers);
    expect(headers.get('anthropic-dangerous-direct-browser-access')).toBe('true');
    expect(headers.get('x-api-key')).toBe('k');
    const body = JSON.parse(String(call?.init.body)) as Record<string, unknown>;
    expect(body).toMatchObject({ system: 'Be brief.', max_tokens: 128000, stream: true });
  });

  it('is ready only with a key', () => {
    expect(createAnthropicProvider({ apiKey: () => '' }).ready()).toBe(false);
  });
});

describe('Anthropic requests', () => {
  it('turns tool calls and results into blocks and opens with the user', () => {
    expect(
      toMessages([
        {
          role: 'assistant',
          content: 'Rolling',
          toolCalls: [{ id: 't1', name: 'roll', arguments: '{"n":2}' }],
        },
        { role: 'tool', toolCallId: 't1', content: '7' },
        { role: 'user', content: '' },
      ]),
    ).toEqual([
      { role: 'user', content: 'Continue.' },
      {
        role: 'assistant',
        content: [
          { type: 'text', text: 'Rolling' },
          { type: 'tool_use', id: 't1', name: 'roll', input: { n: 2 } },
        ],
      },
      { role: 'user', content: [{ type: 'tool_result', tool_use_id: 't1', content: '7' }] },
    ]);
  });

  it('maps tools, tool choice and structured output', () => {
    const params = toParams(
      {
        modality: 'text',
        model: 'm',
        messages: [{ role: 'user', content: 'Go' }],
        tools: [{ name: 'roll', description: 'Roll', parameters: { properties: {} } }],
        toolChoice: 'required',
        responseSchema: { name: 'answer', schema: { type: 'object' } },
      },
      100,
    );
    expect(params).toMatchObject({
      max_tokens: 100,
      tools: [{ name: 'roll', input_schema: { type: 'object', properties: {} } }],
      tool_choice: { type: 'any' },
      output_config: { format: { type: 'json_schema', schema: { type: 'object' } } },
    });
  });
});
