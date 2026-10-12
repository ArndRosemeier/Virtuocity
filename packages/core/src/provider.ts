import type { Identified } from './registry';
import type { Modality } from './models';
import type { CallStats } from './stats';

export interface ChatMessage {
  readonly role: 'system' | 'user' | 'assistant';
  readonly content: string;
}

export interface CompletionRequest {
  readonly modality: Modality;
  readonly model: string;
  readonly messages: readonly ChatMessage[];
  readonly signal?: AbortSignal;
}

export interface CompletionResult {
  readonly text: string;
  readonly stats: CallStats;
}

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

/** A backend that can run model calls (OpenRouter in the first iteration). */
export interface ModelProvider extends Identified {
  complete(request: CompletionRequest): Promise<CompletionResult>;
  /** The provider's model catalog, if it can list one. */
  listModels?(): Promise<readonly ModelInfo[]>;
}

/** Models that can produce the given modality. */
export function modelsFor(models: readonly ModelInfo[], modality: Modality): ModelInfo[] {
  return models.filter((m) => m.outputs.includes(modality));
}
