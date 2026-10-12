import type {
  CompletionRequest,
  CompletionResult,
  ModelInfo,
  ModelProvider,
  ProviderOptions,
  VirtuocityModule,
} from '@virtuocity/core';
import { cachedCatalog } from '@virtuocity/core';
import { failUnlessOk, jsonPost, readAnswer } from './http';
import type { ImagesResponse } from './images';
import { fromImagesResponse, imagesBody } from './images';
import { requestBody, toResult } from './wire';

const API = 'https://api.openai.com/v1';
const NAME = 'OpenAI';

/** Image models answer on the images endpoint; their ids start like this. */
const IMAGE_MODEL = /^(gpt-image|chatgpt-image|dall-e)/;
/** Chat models; everything else in the list (embeddings, speech, moderation…) is left out. */
const CHAT_MODEL = /^(gpt-|o\d|chatgpt-)/;
const NOT_CHAT = /(audio|realtime|transcribe|tts|search|embedding|moderation|instruct|codex)/;

/** What OpenAI's model list tells us: ids only, so the kind of model is read from the id. */
export function openAIModelInfo(id: string): ModelInfo | undefined {
  if (IMAGE_MODEL.test(id)) return { id, name: id, outputs: ['image'], inputs: ['text'] };
  if (CHAT_MODEL.test(id) && !NOT_CHAT.test(id))
    return { id, name: id, outputs: ['text'], inputs: ['text'] };
  return undefined;
}

async function fetchOpenAIModels(doFetch: typeof fetch, key: string): Promise<ModelInfo[]> {
  const response = await doFetch(`${API}/models`, { headers: { Authorization: `Bearer ${key}` } });
  if (!response.ok) throw new Error(`Could not load OpenAI models (${response.status})`);
  const body = (await response.json()) as { readonly data: readonly { readonly id: string }[] };
  return body.data
    .map((m) => openAIModelInfo(m.id))
    .filter((m): m is ModelInfo => m !== undefined)
    .sort((a, b) => a.id.localeCompare(b.id));
}

/** DALL·E answers with links unless asked for the picture itself; GPT Image always sends it. */
function openAIImagesBody(request: CompletionRequest): Record<string, unknown> {
  const body = imagesBody(request);
  return request.model.startsWith('dall-e') ? { ...body, response_format: 'b64_json' } : body;
}

/** OpenAI, called straight from the browser with the user's key. */
export function createOpenAIProvider(options: ProviderOptions): ModelProvider {
  const doFetch = options.fetch ?? globalThis.fetch.bind(globalThis);
  return {
    id: 'openai',
    name: NAME,
    ready: () => options.apiKey() !== '',
    listModels: cachedCatalog(() => fetchOpenAIModels(doFetch, options.apiKey())),
    async complete(request: CompletionRequest): Promise<CompletionResult> {
      const post = jsonPost(doFetch, { Authorization: `Bearer ${options.apiKey()}` }, request);
      if (request.modality === 'image') {
        const response = await post(`${API}/images/generations`, openAIImagesBody(request));
        await failUnlessOk(NAME, response);
        const body = (await response.json()) as ImagesResponse;
        return toResult(fromImagesResponse(body, request.model), request.model);
      }
      const usage = request.onText ? { stream_options: { include_usage: true } } : {};
      const response = await post(`${API}/chat/completions`, { ...requestBody(request), ...usage });
      await failUnlessOk(NAME, response);
      return toResult(await readAnswer(response, request), request.model);
    },
  };
}

export function openAIModule(options: ProviderOptions): VirtuocityModule {
  return {
    id: 'openai',
    register: (host) => host.providers.register(createOpenAIProvider(options)),
  };
}
