import type { ModelInfo } from '@virtuocity/core';

const MODELS_ENDPOINT = 'https://openrouter.ai/api/v1/models';
/** The endpoint returns only text models unless asked for all, in pages of at most 1000. */
const PAGE_SIZE = 1000;
const MAX_PAGES = 20;

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

async function fetchPage(
  doFetch: typeof fetch,
  offset: number,
): Promise<readonly OpenRouterModel[]> {
  const url = `${MODELS_ENDPOINT}?output_modalities=all&limit=${PAGE_SIZE}&offset=${offset}`;
  const response = await doFetch(url);
  if (!response.ok) throw new Error(`Could not load OpenRouter models (${response.status})`);
  const body = (await response.json()) as { readonly data: readonly OpenRouterModel[] };
  return body.data;
}

/** OpenRouter's public model catalog across every output modality; no key needed. */
export async function fetchModels(doFetch: typeof fetch): Promise<ModelInfo[]> {
  const all: OpenRouterModel[] = [];
  for (let page = 0; page < MAX_PAGES; page++) {
    const models = await fetchPage(doFetch, page * PAGE_SIZE);
    all.push(...models);
    if (models.length < PAGE_SIZE) break;
  }
  return all.map(toModelInfo);
}
