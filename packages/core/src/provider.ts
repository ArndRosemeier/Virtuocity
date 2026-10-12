import type { Identified } from './registry';
import type { GeneratedMedia } from './media';
import type { Modality } from './models';
import type { CallStats } from './stats';

/** A function the model may call, described by a JSON Schema for its arguments. */
export interface ToolSpec {
  readonly name: string;
  readonly description: string;
  readonly parameters: Readonly<Record<string, unknown>>;
}

/** A call the model asked for. `arguments` is the raw JSON text the model wrote. */
export interface ToolCall {
  readonly id: string;
  readonly name: string;
  readonly arguments: string;
}

export type ChatMessage =
  | { readonly role: 'system' | 'user'; readonly content: string }
  | {
      readonly role: 'assistant';
      readonly content: string;
      readonly toolCalls?: readonly ToolCall[];
    }
  | { readonly role: 'tool'; readonly toolCallId: string; readonly content: string };

export interface CompletionRequest {
  readonly modality: Modality;
  readonly model: string;
  readonly messages: readonly ChatMessage[];
  readonly signal?: AbortSignal;
  /** Functions the model may call instead of (or before) answering. */
  readonly tools?: readonly ToolSpec[];
  /** `'none'` forbids tool calls even when tools are listed. */
  readonly toolChoice?: 'auto' | 'required' | 'none';
  /** Asks for a JSON answer matching this schema, where the model supports it. */
  readonly responseSchema?: {
    readonly name: string;
    readonly schema: Readonly<Record<string, unknown>>;
  };
  /** Receives text as it is generated. Providers that cannot stream call it once at the end. */
  readonly onText?: (delta: string) => void;
}

export interface CompletionResult {
  readonly text: string;
  readonly toolCalls?: readonly ToolCall[];
  /** Pictures or sound, for image and audio calls. */
  readonly media?: readonly GeneratedMedia[];
  readonly stats: CallStats;
}

/** A model call as skills make it: the runtime picks the model. */
export type ModelRequest = Omit<CompletionRequest, 'model'>;
export type Complete = (request: ModelRequest) => Promise<CompletionResult>;

/** What a provider tells us about one of its models, for pickers and cost display. */
export interface ModelInfo {
  readonly id: string;
  readonly name: string;
  readonly description?: string;
  /** Modalities the model can produce, e.g. `['text']` or `['image', 'text']`. */
  readonly outputs: readonly Modality[];
  readonly inputs: readonly Modality[];
  readonly contextLength?: number;
  /** USD per million tokens, when the provider reports it. */
  readonly pricing?: { readonly prompt: number; readonly completion: number };
}

/** A backend that can run model calls, such as OpenRouter, OpenAI or Anthropic. */
export interface ModelProvider extends Identified {
  /** Shown in pickers, e.g. "OpenAI". */
  readonly name: string;
  /** Whether it can run calls now, e.g. once its key is set. Pickers offer only ready providers. */
  ready(): boolean;
  complete(request: CompletionRequest): Promise<CompletionResult>;
  /** The provider's model catalog, if it can list one. */
  listModels?(): Promise<readonly ModelInfo[]>;
}

/** What a provider called with the user's own key needs. */
export interface ProviderOptions {
  /** Returns the user's key for the provider; spend limits are set on the key itself. */
  readonly apiKey: () => string;
  readonly fetch?: typeof fetch;
}

/** Loads a catalog once and shares it; a failed load is tried again on the next call. */
export function cachedCatalog(load: () => Promise<ModelInfo[]>): () => Promise<ModelInfo[]> {
  let catalog: Promise<ModelInfo[]> | undefined;
  return () => {
    const pending =
      catalog ??
      load().catch((error: unknown) => {
        catalog = undefined;
        throw error;
      });
    catalog = pending;
    return pending;
  };
}

/** Models that can produce the given modality. */
export function modelsFor(models: readonly ModelInfo[], modality: Modality): ModelInfo[] {
  return models.filter((m) => m.outputs.includes(modality));
}

/** A conversation flattened into one prompt, for models that take a single prompt (image models). */
export function promptText(messages: readonly ChatMessage[]): string {
  return messages
    .filter((m) => m.role !== 'tool')
    .map((m) => m.content)
    .join('\n\n');
}
