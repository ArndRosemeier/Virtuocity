import Anthropic from '@anthropic-ai/sdk';
import type {
  CompletionRequest,
  CompletionResult,
  ModelInfo,
  ModelProvider,
  ProviderOptions,
  VirtuocityModule,
} from '@virtuocity/core';
import { cachedCatalog } from '@virtuocity/core';
import { fromMessage, toParams } from './wire';

export * from './wire';

/** Output limit for a model the catalog does not describe. */
const FALLBACK_MAX_TOKENS = 32_000;

interface AnthropicModel extends ModelInfo {
  readonly maxTokens?: number;
}

async function fetchModels(client: Anthropic): Promise<AnthropicModel[]> {
  const models: AnthropicModel[] = [];
  for await (const m of client.models.list({ limit: 1000 })) {
    models.push({
      id: m.id,
      name: m.display_name,
      outputs: ['text'],
      inputs: ['text', 'image'],
      ...(m.max_input_tokens ? { contextLength: m.max_input_tokens } : {}),
      ...(m.max_tokens ? { maxTokens: m.max_tokens } : {}),
    });
  }
  return models;
}

/** Newer models refuse a forced tool call; they are asked to pick one themselves instead. */
function isForcedToolRefused(error: unknown, request: CompletionRequest): boolean {
  return (
    request.toolChoice === 'required' &&
    error instanceof Anthropic.BadRequestError &&
    /tool_choice/.test(error.message)
  );
}

/** Anthropic's Messages API, called straight from the browser with the user's key. */
export function createAnthropicProvider(options: ProviderOptions): ModelProvider {
  const client = () =>
    new Anthropic({
      apiKey: options.apiKey(),
      dangerouslyAllowBrowser: true,
      ...(options.fetch ? { fetch: options.fetch } : {}),
    });
  const listModels = cachedCatalog(() => fetchModels(client()));
  const maxTokens = async (model: string) => {
    const known = await listModels().catch(() => []);
    const found: AnthropicModel | undefined = known.find((m) => m.id === model);
    return found?.maxTokens ?? FALLBACK_MAX_TOKENS;
  };
  /** Always streams: long answers would otherwise run into request time limits. */
  const run = async (request: CompletionRequest, params: Anthropic.MessageStreamParams) => {
    const stream = client().messages.stream(params, {
      ...(request.signal ? { signal: request.signal } : {}),
    });
    const onText = request.onText;
    if (onText) stream.on('text', (delta) => onText(delta));
    return fromMessage(await stream.finalMessage());
  };
  return {
    id: 'anthropic',
    name: 'Anthropic',
    ready: () => options.apiKey() !== '',
    listModels,
    async complete(request: CompletionRequest): Promise<CompletionResult> {
      const params = toParams(request, await maxTokens(request.model));
      try {
        return await run(request, params);
      } catch (error) {
        if (!isForcedToolRefused(error, request)) throw error;
        return run(request, { ...params, tool_choice: { type: 'auto' } });
      }
    },
  };
}

export function anthropicModule(options: ProviderOptions): VirtuocityModule {
  return {
    id: 'anthropic',
    register: (host) => host.providers.register(createAnthropicProvider(options)),
  };
}
