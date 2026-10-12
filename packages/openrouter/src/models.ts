import type { ModelInfo } from '@virtuocity/core';

const MODELS_ENDPOINT = 'https://openrouter.ai/api/v1/models';

interface OpenRouterModel {
  readonly id: string;
  readonly name: string;
  readonly description?: string;
  readonly context_length?: number;
  readonly architecture?: {
    readonly input_modalities?: readonly string[];
    readonly output_modalities?: readonly string[];
  };
  readonly pricing?: { readonly prompt?: string; readonly completion?: string };
}

const PER_MILLION = 1_000_000;

function perMillion(value: string | undefined): number | undefined {
  const n = Number(value);
  return value === undefined || Number.isNaN(n) || n < 0 ? undefined : n * PER_MILLION;
}

export function toModelInfo(model: OpenRouterModel): ModelInfo {
  const prompt = perMillion(model.pricing?.prompt);
  const completion = perMillion(model.pricing?.completion);
  return {
    id: model.id,
    name: model.name,
    outputs: model.architecture?.output_modalities ?? ['text'],
    inputs: model.architecture?.input_modalities ?? ['text'],
    ...(model.description ? { description: model.description } : {}),
    ...(model.context_length ? { contextLength: model.context_length } : {}),
    ...(prompt !== undefined && completion !== undefined
      ? { pricing: { prompt, completion } }
      : {}),
  };
}

/** OpenRouter's public model catalog; no key needed. */
export async function fetchModels(doFetch: typeof fetch): Promise<ModelInfo[]> {
  const response = await doFetch(MODELS_ENDPOINT);
  if (!response.ok) throw new Error(`Could not load OpenRouter models (${response.status})`);
  const body = (await response.json()) as { readonly data: readonly OpenRouterModel[] };
  return body.data.map(toModelInfo);
}
