import { describe, expect, it, vi } from 'vitest';
import { createOpenRouterProvider } from './index';
import { readStream } from './stream';
import { requestBody } from './wire';

/** A response body delivered in the given pieces, to test splits mid-line. */
function body(pieces: string[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  return new ReadableStream({
    start(controller) {
      for (const piece of pieces) controller.enqueue(encoder.encode(piece));
      controller.close();
    },
  });
}

const event = (data: unknown) => `data: ${JSON.stringify(data)}\n\n`;
const delta = (d: unknown, extra: object = {}) =>
  event({ model: 'x/m', choices: [{ delta: d }], ...extra });

describe('readStream', () => {
  it('streams text, ignores comments and survives chunks split mid-line', async () => {
    const raw = [
      ': OPENROUTER PROCESSING\n\n',
      delta({ content: 'Hel' }),
      delta({ content: 'lo' }),
      event({ choices: [], usage: { prompt_tokens: 5, completion_tokens: 2, cost: 0.001 } }),
      'data: [DONE]\n\n',
    ].join('');
    const pieces = [raw.slice(0, 37), raw.slice(37, 90), raw.slice(90)];
    const seen: string[] = [];
    const answer = await readStream(body(pieces), (d) => seen.push(d));
    expect(seen).toEqual(['Hel', 'lo']);
    expect(answer).toEqual({
      model: 'x/m',
      text: 'Hello',
      toolCalls: [],
      media: [],
      usage: { prompt_tokens: 5, completion_tokens: 2, cost: 0.001 },
    });
  });

  it('assembles tool calls from their pieces', async () => {
    const answer = await readStream(
      body([
        delta({
          tool_calls: [{ index: 0, id: 'c1', function: { name: 'dice_roll', arguments: '{"no' } }],
        }),
        delta({
          tool_calls: [{ index: 1, id: 'c2', function: { name: 'coin_flip', arguments: '{}' } }],
        }),
        delta({ tool_calls: [{ index: 0, function: { arguments: 'tation":"d20"}' } }] }),
        'data: [DONE]\n',
      ]),
      () => {},
    );
    expect(answer.toolCalls).toEqual([
      { id: 'c1', name: 'dice_roll', arguments: '{"notation":"d20"}' },
      { id: 'c2', name: 'coin_flip', arguments: '{}' },
    ]);
  });

  it('fails on an error event', async () => {
    const stream = body([
      delta({ content: 'Hi' }),
      event({ error: { message: 'Provider overloaded' } }),
    ]);
    await expect(readStream(stream, () => {})).rejects.toThrow(/Provider overloaded/);
  });
});

describe('requests', () => {
  it('sends tools, tool results, structured output and the stream flag', () => {
    const wire = requestBody({
      modality: 'text',
      model: 'm',
      messages: [
        { role: 'user', content: 'Roll' },
        {
          role: 'assistant',
          content: '',
          toolCalls: [{ id: 'c1', name: 'roll', arguments: '{}' }],
        },
        { role: 'tool', toolCallId: 'c1', content: '7' },
      ],
      tools: [{ name: 'roll', description: 'Roll', parameters: { type: 'object' } }],
      toolChoice: 'auto',
      responseSchema: { name: 'answer', schema: { type: 'object' } },
      onText: () => {},
    });
    expect(wire).toMatchObject({
      stream: true,
      tool_choice: 'auto',
      tools: [{ type: 'function', function: { name: 'roll', parameters: { type: 'object' } } }],
      response_format: { type: 'json_schema', json_schema: { name: 'answer' } },
      messages: [
        { role: 'user', content: 'Roll' },
        {
          role: 'assistant',
          tool_calls: [{ id: 'c1', type: 'function', function: { name: 'roll' } }],
        },
        { role: 'tool', tool_call_id: 'c1', content: '7' },
      ],
    });
  });

  it('streams through the provider when asked to', async () => {
    const fetchMock = vi.fn(() =>
      Promise.resolve(new Response(body([delta({ content: 'Hi' }), 'data: [DONE]\n\n']))),
    );
    const provider = createOpenRouterProvider({ apiKey: () => 'k', fetch: fetchMock });
    const seen: string[] = [];
    const result = await provider.complete({
      modality: 'text',
      model: 'm',
      messages: [],
      onText: (d) => seen.push(d),
    });
    expect(result.text).toBe('Hi');
    expect(seen).toEqual(['Hi']);
    expect(result.toolCalls).toBeUndefined();
  });

  it('returns tool calls from a plain response', async () => {
    const reply = {
      model: 'm',
      choices: [
        {
          message: {
            content: null,
            tool_calls: [
              { id: 'c', type: 'function', function: { name: 'roll', arguments: '{}' } },
            ],
          },
        },
      ],
    };
    const fetchMock = vi.fn(() => Promise.resolve(new Response(JSON.stringify(reply))));
    const provider = createOpenRouterProvider({ apiKey: () => 'k', fetch: fetchMock });
    const result = await provider.complete({ modality: 'text', model: 'm', messages: [] });
    expect(result.toolCalls).toEqual([{ id: 'c', name: 'roll', arguments: '{}' }]);
  });
});

describe('models without tool support', () => {
  it('retries without tools when OpenRouter finds no endpoint for them', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response('{"error":{"message":"No endpoints found that support tool use"}}', {
          status: 404,
        }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ model: 'm', choices: [{ message: { content: 'Hi' } }] })),
      );
    const provider = createOpenRouterProvider({ apiKey: () => 'k', fetch: fetchMock });
    const tools = [{ name: 'roll', description: 'Roll', parameters: { type: 'object' } }];
    const result = await provider.complete({ modality: 'text', model: 'm', messages: [], tools });
    expect(result.text).toBe('Hi');
    const second = fetchMock.mock.calls[1] as [string, RequestInit];
    expect(JSON.parse(String(second[1].body))).not.toHaveProperty('tools');
  });
});

describe('generated images', () => {
  const image = { image_url: { url: 'data:image/png;base64,AAEC' } };

  it('asks for image output and reads pictures from a plain response', async () => {
    const reply = { model: 'm', choices: [{ message: { content: '', images: [image] } }] };
    const fetchMock = vi.fn(() => Promise.resolve(new Response(JSON.stringify(reply))));
    const provider = createOpenRouterProvider({ apiKey: () => 'k', fetch: fetchMock });
    const result = await provider.complete({ modality: 'image', model: 'm', messages: [] });
    expect(result.media).toEqual([{ mime: 'image/png', bytes: new Uint8Array([0, 1, 2]) }]);
    const sent = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(JSON.parse(String(sent[1].body))).toMatchObject({ modalities: ['image', 'text'] });
  });

  it('reads pictures from a stream', async () => {
    const answer = await readStream(
      body([delta({ images: [image] }), 'data: [DONE]\n\n']),
      () => {},
    );
    expect(answer.media).toHaveLength(1);
  });
});
