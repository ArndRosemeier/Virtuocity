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

/** A backend that can run model calls (OpenRouter in the first iteration). */
export interface ModelProvider extends Identified {
  complete(request: CompletionRequest): Promise<CompletionResult>;
}
