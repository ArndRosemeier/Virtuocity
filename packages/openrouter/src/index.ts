import type {
  CompletionRequest,
  CompletionResult,
  ModelInfo,
  ModelProvider,
  VirtuocityModule,
} from '@virtuocity/core';
import { fetchModels } from './models';
import { readStream } from './stream';
import type { Answer, WireToolCall, WireUsage } from './wire';
import { fromWireCalls, requestBody, toResult } from './wire';

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
      const post = (r: CompletionRequest) =>
        doFetch(ENDPOINT, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${options.apiKey()}`,
            'Content-Type': 'application/json',
            'X-Title': options.appTitle ?? 'Virtuocity',
          },
          body: JSON.stringify(requestBody(r)),
          ...(r.signal ? { signal: r.signal } : {}),
        });
      let response = await post(request);
      let error = response.ok ? '' : await response.text();
      if (isToolsUnsupported(response.status, error, request)) {
        // The model cannot call tools; let it answer without them.
        response = await post(withoutTools(request));
        error = response.ok ? '' : await response.text();
      }
      if (!response.ok) throw new Error(`OpenRouter request failed (${response.status}): ${error}`);
      return toResult(await readAnswer(response, request), request.model);
    },
  };
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
