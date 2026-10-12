import type { CompletionRequest } from '@virtuocity/core';
import { decodeBase64 } from '@virtuocity/core';
import type { Answer } from './wire';

/** Image-only models (no chat) are served here instead of chat completions. */
export const IMAGES_ENDPOINT = 'https://openrouter.ai/api/v1/images';

export interface ImagesResponse {
  readonly data?: readonly { readonly b64_json: string; readonly media_type?: string }[];
  readonly usage?: {
    readonly prompt_tokens?: number;
    readonly completion_tokens?: number;
    readonly cost?: number;
  };
}

/** OpenRouter answers 404 and points to the images endpoint for image-only models. */
export function needsImagesEndpoint(
  status: number,
  error: string,
  request: CompletionRequest,
): boolean {
  return request.modality === 'image' && status === 404 && /\/images\b/i.test(error);
}

/** The images endpoint takes one prompt, so the conversation is flattened into it. */
export function imagesBody(request: CompletionRequest): Record<string, unknown> {
  const prompt = request.messages
    .filter((m) => m.role !== 'tool')
    .map((m) => m.content)
    .join('\n\n');
  return { model: request.model, prompt, n: 1 };
}

export function fromImagesResponse(body: ImagesResponse, model: string): Answer {
  const { usage } = body;
  return {
    model,
    text: '',
    toolCalls: [],
    media: (body.data ?? []).map((image) => ({
      mime: image.media_type ?? 'image/png',
      bytes: decodeBase64(image.b64_json),
    })),
    usage: {
      prompt_tokens: usage?.prompt_tokens ?? 0,
      completion_tokens: usage?.completion_tokens ?? 0,
      ...(usage?.cost === undefined ? {} : { cost: usage.cost }),
    },
  };
}
