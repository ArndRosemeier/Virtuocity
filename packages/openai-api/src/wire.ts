import type {
  ChatMessage,
  ChatPart,
  CompletionRequest,
  CompletionResult,
  GeneratedMedia,
  ToolCall,
} from '@virtuocity/core';
import { decodeDataUrl } from '@virtuocity/core';

/** OpenAI's chat completion shapes (which OpenRouter speaks too), as far as we use them. */
export interface WireToolCall {
  readonly id: string;
  readonly type: 'function';
  readonly function: { readonly name: string; readonly arguments: string };
}

export interface WireUsage {
  readonly prompt_tokens: number;
  readonly completion_tokens: number;
  readonly cost?: number;
}

/** A generated picture, as OpenRouter returns it in chat answers. */
export interface WireImage {
  readonly image_url: { readonly url: string };
}

/** What one answer adds up to, streamed or not. */
export interface Answer {
  readonly model: string;
  readonly text: string;
  readonly toolCalls: readonly ToolCall[];
  readonly media: readonly GeneratedMedia[];
  readonly usage?: WireUsage | undefined;
}

function toWireMessage(message: ChatMessage): Record<string, unknown> {
  if (message.role === 'tool') {
    return { role: 'tool', tool_call_id: message.toolCallId, content: message.content };
  }
  if (message.role === 'assistant' && message.toolCalls?.length) {
    const calls: WireToolCall[] = message.toolCalls.map((c) => ({
      id: c.id,
      type: 'function',
      function: { name: c.name, arguments: c.arguments },
    }));
    return { role: 'assistant', content: message.content, tool_calls: calls };
  }
  if (message.role === 'user' && typeof message.content !== 'string') {
    return { role: 'user', content: message.content.map(wirePart) };
  }
  return { role: message.role, content: message.content };
}

/** Words as text, pictures by their data URL; a picture without one becomes its `alt`. */
function wirePart(part: ChatPart): Record<string, unknown> {
  if (part.type === 'image' && part.url) return { type: 'image_url', image_url: { url: part.url } };
  return { type: 'text', text: part.type === 'text' ? part.text : part.alt };
}

/** What an image request asks a model for: the pictures and text among its outputs. */
const imageModalities = (outputs: readonly string[] = []) =>
  outputs.filter((m) => m === 'image' || m === 'text');

/**
 * The JSON body of a chat completion request. Image requests, and text
 * requests to a model that can also paint, ask for the output modalities the
 * model has (`outputs`, from the catalog): pictures only from a model that
 * cannot write, pictures and text from one that can.
 */
export function requestBody(
  request: CompletionRequest,
  outputs?: readonly string[],
): Record<string, unknown> {
  const { tools, toolChoice, responseSchema } = request;
  return {
    model: request.model,
    messages: request.messages.map(toWireMessage),
    ...(request.modality === 'image' || outputs?.includes('image')
      ? { modalities: imageModalities(outputs) }
      : {}),
    ...(request.onText ? { stream: true } : {}),
    ...(tools?.length
      ? {
          tools: tools.map((t) => ({
            type: 'function',
            function: { name: t.name, description: t.description, parameters: t.parameters },
          })),
        }
      : {}),
    ...(toolChoice && tools?.length ? { tool_choice: toolChoice } : {}),
    ...(responseSchema
      ? {
          response_format: {
            type: 'json_schema',
            json_schema: { name: responseSchema.name, schema: responseSchema.schema },
          },
        }
      : {}),
  };
}

export function fromWireCalls(calls: readonly WireToolCall[] | undefined): ToolCall[] {
  return (calls ?? []).map((c) => ({
    id: c.id,
    name: c.function.name,
    arguments: c.function.arguments,
  }));
}

export function fromWireImages(images: readonly WireImage[] | undefined): GeneratedMedia[] {
  return (images ?? []).map((image) => decodeDataUrl(image.image_url.url));
}

export function toResult(answer: Answer, requestedModel: string): CompletionResult {
  const { usage } = answer;
  return {
    text: answer.text,
    ...(answer.toolCalls.length ? { toolCalls: answer.toolCalls } : {}),
    ...(answer.media.length ? { media: answer.media } : {}),
    stats: {
      model: answer.model || requestedModel,
      promptTokens: usage?.prompt_tokens ?? 0,
      completionTokens: usage?.completion_tokens ?? 0,
      ...(usage?.cost === undefined ? {} : { costUsd: usage.cost }),
    },
  };
}
