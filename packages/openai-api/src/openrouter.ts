import type {
  CompletionRequest,
  CompletionResult,
  ModelProvider,
  ProviderOptions,
  VirtuocityModule,
} from '@virtuocity/core';
import { cachedCatalog, withoutPictures } from '@virtuocity/core';
import { decide } from './decisions';
import { failUnlessOk, jsonPost, readAnswer } from './http';
import type { ImagesResponse } from './images';
import { IMAGES_ENDPOINT, fromImagesResponse, imagesBody, needsImagesEndpoint } from './images';
import { fetchModels } from './models';
import { requestBody, toResult } from './wire';

const ENDPOINT = 'https://openrouter.ai/api/v1/chat/completions';
const NAME = 'OpenRouter';

export interface OpenRouterOptions extends ProviderOptions {
  readonly appTitle?: string;
}

export function createOpenRouterProvider(options: OpenRouterOptions): ModelProvider {
  const doFetch = options.fetch ?? globalThis.fetch.bind(globalThis);
  const listModels = cachedCatalog(() => fetchModels(doFetch));
  /** Models that turned out to be image-only, so they go straight to the images endpoint. */
  const imageOnly = new Set<string>();
  /** What a model takes and makes, per the catalog the model picker offers. */
  const infoOf = async (model: string) => (await listModels()).find((m) => m.id === model);
  /** An image call needs the model's outputs; a text call works without them. */
  const outputsOf = async (request: CompletionRequest) => {
    const found = await infoOf(request.model).catch(() => undefined);
    if (found || request.modality !== 'image') return found;
    throw new Error(`Model "${request.model}" is not in OpenRouter's model list.`);
  };
  const headersNow = () => ({
    Authorization: `Bearer ${options.apiKey()}`,
    'X-Title': options.appTitle ?? 'Virtuocity',
  });
  return {
    id: 'openrouter',
    name: NAME,
    ready: () => options.apiKey() !== '',
    listModels,
    decide: (request) => decide(doFetch, headersNow(), request),
    async complete(asked: CompletionRequest): Promise<CompletionResult> {
      const info = await outputsOf(asked);
      // A model that cannot see pictures gets their descriptions instead.
      const request = info?.inputs.includes('image')
        ? asked
        : { ...asked, messages: withoutPictures(asked.messages) };
      const headers = headersNow();
      const post = jsonPost(doFetch, headers, request);
      const chat = (r: CompletionRequest, outputs?: readonly string[]) =>
        post(ENDPOINT, { ...requestBody(r, outputs), usage: { include: true } });
      const images = () => post(IMAGES_ENDPOINT, imagesBody(request));
      if (imageOnly.has(request.model)) return fromImages(await images(), request.model);
      const outputs = info?.outputs;
      let response = await chat(request, outputs);
      let error = response.ok ? '' : await response.text();
      if (needsImagesEndpoint(response.status, error, request)) {
        imageOnly.add(request.model);
        return fromImages(await images(), request.model);
      }
      if (isToolsUnsupported(response.status, error, request)) {
        // The model cannot call tools; let it answer without them.
        response = await chat(withoutTools(request), outputs);
        error = response.ok ? '' : await response.text();
      }
      await failUnlessOk(NAME, response, error);
      return toResult(await readAnswer(response, request), request.model);
    },
  };
}

/** An answer from the images endpoint, which image-only models use. */
async function fromImages(response: Response, model: string): Promise<CompletionResult> {
  await failUnlessOk(NAME, response);
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
