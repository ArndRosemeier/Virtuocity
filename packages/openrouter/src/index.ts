import type {
  CompletionRequest,
  CompletionResult,
  ModelInfo,
  ModelProvider,
  VirtuocityModule,
} from '@virtuocity/core';
import type { ImagesResponse } from './images';
import { IMAGES_ENDPOINT, fromImagesResponse, imagesBody, needsImagesEndpoint } from './images';
import { fetchModels } from './models';
import { readStream } from './stream';
import type { Answer, WireImage, WireToolCall, WireUsage } from './wire';
import { fromWireCalls, fromWireImages, requestBody, toResult } from './wire';

export * from './models';

const ENDPOINT = 'https://openrouter.ai/api/v1/chat/completions';

export interface OpenRouterOptions {
  /** Returns the user's OpenRouter key; spend limits are set on the key itself. */
  readonly apiKey: () => string;
  readonly fetch?: typeof fetch;
  readonly appTitle?: string;
}

interface OpenRouterResponse {
  readonly model: string;
  readonly choices: readonly {
    readonly message: {
      readonly content: string | null;
      readonly tool_calls?: readonly WireToolCall[];
      readonly images?: readonly WireImage[];
    };
  }[];
  readonly usage?: WireUsage;
}

function fromResponse(body: OpenRouterResponse): Answer {
  const message = body.choices[0]?.message;
  return {
    model: body.model,
    text: message?.content ?? '',
    toolCalls: fromWireCalls(message?.tool_calls),
    media: fromWireImages(message?.images),
    usage: body.usage,
  };
}

async function readAnswer(response: Response, request: CompletionRequest): Promise<Answer> {
  if (request.onText && response.body) return readStream(response.body, request.onText);
  const answer = fromResponse((await response.json()) as OpenRouterResponse);
  if (answer.text) request.onText?.(answer.text);
  return answer;
}

export function createOpenRouterProvider(options: OpenRouterOptions): ModelProvider {
  const doFetch = options.fetch ?? globalThis.fetch.bind(globalThis);
  let catalog: Promise<ModelInfo[]> | undefined;
  /** Models that turned out to be image-only, so they go straight to the images endpoint. */
  const imageOnly = new Set<string>();
  const listModels = () => {
    const pending =
      catalog ??
      fetchModels(doFetch).catch((error: unknown) => {
        catalog = undefined;
        throw error;
      });
    catalog = pending;
    return pending;
  };
  /** What a model outputs, per the catalog the model picker offers. */
  const outputsOf = async (model: string) => {
    const found = (await listModels()).find((m) => m.id === model);
    if (!found) throw new Error(`Model "${model}" is not in OpenRouter's model list.`);
    return found.outputs;
  };
  return {
    id: 'openrouter',
    listModels,
    async complete(request: CompletionRequest): Promise<CompletionResult> {
      const post = (url: string, body: Record<string, unknown>) =>
        doFetch(url, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${options.apiKey()}`,
            'Content-Type': 'application/json',
            'X-Title': options.appTitle ?? 'Virtuocity',
          },
          body: JSON.stringify(body),
          ...(request.signal ? { signal: request.signal } : {}),
        });
      const images = () => post(IMAGES_ENDPOINT, imagesBody(request));
      if (imageOnly.has(request.model)) return fromImages(await images(), request.model);
      const outputs = request.modality === 'image' ? await outputsOf(request.model) : undefined;
      let response = await post(ENDPOINT, requestBody(request, outputs));
      let error = response.ok ? '' : await response.text();
      if (needsImagesEndpoint(response.status, error, request)) {
        imageOnly.add(request.model);
        return fromImages(await images(), request.model);
      }
      if (isToolsUnsupported(response.status, error, request)) {
        // The model cannot call tools; let it answer without them.
        response = await post(ENDPOINT, requestBody(withoutTools(request), outputs));
        error = response.ok ? '' : await response.text();
      }
      await failUnlessOk(response, error);
      return toResult(await readAnswer(response, request), request.model);
    },
  };
}

async function failUnlessOk(response: Response, error?: string): Promise<void> {
  if (response.ok) return;
  const text = error ?? (await response.text());
  throw new Error(`OpenRouter request failed (${response.status}): ${text}`);
}

/** An answer from the images endpoint, which image-only models use. */
async function fromImages(response: Response, model: string): Promise<CompletionResult> {
  await failUnlessOk(response);
  const answer = fromImagesResponse((await response.json()) as ImagesResponse, model);
  return toResult(answer, model);
}

/** OpenRouter answers 404 when no endpoint of the model supports tool use. */
function isToolsUnsupported(status: number, error: string, request: CompletionRequest): boolean {
  return status === 404 && /tool/i.test(error) && (request.tools?.length ?? 0) > 0;
}

function withoutTools(request: CompletionRequest): CompletionRequest {
  const copy: { -readonly [K in keyof CompletionRequest]?: CompletionRequest[K] } = { ...request };
  delete copy.tools;
  delete copy.toolChoice;
  return { ...copy, modality: request.modality, model: request.model, messages: request.messages };
}

export function openRouterModule(options: OpenRouterOptions): VirtuocityModule {
  return {
    id: 'openrouter',
    register: (host) => host.providers.register(createOpenRouterProvider(options)),
  };
}
