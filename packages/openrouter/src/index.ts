import type {
  CompletionRequest,
  CompletionResult,
  ModelInfo,
  ModelProvider,
  VirtuocityModule,
} from '@virtuocity/core';
import { fetchModels } from './models';

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
  readonly choices: readonly { readonly message: { readonly content: string | null } }[];
  readonly usage?: {
    readonly prompt_tokens: number;
    readonly completion_tokens: number;
    readonly cost?: number;
  };
}

export function createOpenRouterProvider(options: OpenRouterOptions): ModelProvider {
  const doFetch = options.fetch ?? globalThis.fetch.bind(globalThis);
  let catalog: Promise<ModelInfo[]> | undefined;
  return {
    id: 'openrouter',
    listModels() {
      const pending =
        catalog ??
        fetchModels(doFetch).catch((error: unknown) => {
          catalog = undefined;
          throw error;
        });
      catalog = pending;
      return pending;
    },
    async complete(request: CompletionRequest): Promise<CompletionResult> {
      const response = await doFetch(ENDPOINT, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${options.apiKey()}`,
          'Content-Type': 'application/json',
          'X-Title': options.appTitle ?? 'Virtuocity',
        },
        body: JSON.stringify({
          model: request.model,
          messages: request.messages,
          usage: { include: true },
        }),
        ...(request.signal ? { signal: request.signal } : {}),
      });
      if (!response.ok) {
        throw new Error(`OpenRouter request failed (${response.status}): ${await response.text()}`);
      }
      return toResult((await response.json()) as OpenRouterResponse, request.model);
    },
  };
}

function toResult(body: OpenRouterResponse, requestedModel: string): CompletionResult {
  const usage = body.usage;
  return {
    text: body.choices[0]?.message.content ?? '',
    stats: {
      model: body.model || requestedModel,
      promptTokens: usage?.prompt_tokens ?? 0,
      completionTokens: usage?.completion_tokens ?? 0,
      ...(usage?.cost === undefined ? {} : { costUsd: usage.cost }),
    },
  };
}

export function openRouterModule(options: OpenRouterOptions): VirtuocityModule {
  return {
    id: 'openrouter',
    register: (host) => host.providers.register(createOpenRouterProvider(options)),
  };
}
