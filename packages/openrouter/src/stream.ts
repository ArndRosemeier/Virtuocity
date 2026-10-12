import type { GeneratedMedia } from '@virtuocity/core';
import type { Answer, WireImage, WireUsage } from './wire';
import { fromWireImages } from './wire';

interface ToolCallDelta {
  readonly index: number;
  readonly id?: string;
  readonly function?: { readonly name?: string; readonly arguments?: string };
}

interface Delta {
  readonly content?: string | null;
  readonly tool_calls?: readonly ToolCallDelta[];
  readonly images?: readonly WireImage[];
}

interface Chunk {
  readonly model?: string;
  readonly choices?: readonly { readonly delta?: Delta }[];
  readonly usage?: WireUsage;
  readonly error?: { readonly message?: string };
}

interface PartialCall {
  id: string;
  name: string;
  arguments: string;
}

/** Collects streamed chunks into one answer. */
class Collector {
  model = '';
  text = '';
  usage: WireUsage | undefined;
  readonly media: GeneratedMedia[] = [];
  readonly calls = new Map<number, PartialCall>();

  constructor(private readonly onText: (delta: string) => void) {}

  add(chunk: Chunk): void {
    if (chunk.error) {
      throw new Error(`OpenRouter stream failed: ${chunk.error.message ?? 'unknown error'}`);
    }
    if (chunk.model) this.model = chunk.model;
    if (chunk.usage) this.usage = chunk.usage;
    const delta = chunk.choices?.[0]?.delta;
    if (delta) this.#addDelta(delta);
  }

  #addDelta(delta: Delta): void {
    if (delta.content) {
      this.text += delta.content;
      this.onText(delta.content);
    }
    for (const part of delta.tool_calls ?? []) this.#addCall(part);
    this.media.push(...fromWireImages(delta.images));
  }

  #addCall(part: ToolCallDelta): void {
    const call = this.calls.get(part.index) ?? { id: '', name: '', arguments: '' };
    if (part.id) call.id = part.id;
    if (part.function?.name) call.name += part.function.name;
    if (part.function?.arguments) call.arguments += part.function.arguments;
    this.calls.set(part.index, call);
  }

  answer(): Answer {
    const toolCalls = [...this.calls.entries()]
      .sort(([a], [b]) => a - b)
      .map(([index, c]) => ({ ...c, id: c.id || `call-${index}` }));
    const { model, text, media, usage } = this;
    return { model, text, toolCalls, media, usage };
  }
}

/** Handles one line of server-sent events; returns false at the end of the stream. */
function readLine(line: string, collector: Collector): boolean {
  if (!line.startsWith('data:')) return true; // blank lines and ": keep-alive" comments
  const data = line.slice('data:'.length).trim();
  if (data === '[DONE]') return false;
  collector.add(JSON.parse(data) as Chunk);
  return true;
}

/** Reads an OpenRouter event stream, passing text to `onText` as it arrives. */
export async function readStream(
  body: ReadableStream<Uint8Array>,
  onText: (delta: string) => void,
): Promise<Answer> {
  const collector = new Collector(onText);
  const decoder = new TextDecoder();
  const reader = body.getReader();
  let buffer = '';
  for (;;) {
    const { done, value } = await reader.read();
    buffer += decoder.decode(value, { stream: !done });
    const lines = buffer.split('\n');
    buffer = done ? '' : (lines.pop() ?? '');
    for (const line of lines) {
      if (!readLine(line.trimEnd(), collector)) {
        await reader.cancel();
        return collector.answer();
      }
    }
    if (done) return collector.answer();
  }
}
