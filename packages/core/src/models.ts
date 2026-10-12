/** Kinds of output a model can produce. Open-ended so modules can add more. */
export type Modality = 'text' | 'image' | 'audio' | 'music' | (string & {});

/**
 * A model as settings store it: the provider's id, a colon, then the provider's
 * own model id, e.g. `openrouter:anthropic/claude-sonnet-5.5` or `anthropic:claude-opus-5-5`.
 */
export type ModelRef = string;

export interface ParsedModelRef {
  readonly provider: string;
  readonly model: string;
}

const REF = /^([a-z0-9-]+):(.+)$/;

/** Splits a model reference into provider and model, or `undefined` when it names no provider. */
export function readModelRef(ref: ModelRef): ParsedModelRef | undefined {
  const match = REF.exec(ref);
  return match?.[1] && match[2] ? { provider: match[1], model: match[2] } : undefined;
}

/** `readModelRef` for a reference that must be valid; throws when it names no provider. */
export function parseModelRef(ref: ModelRef): ParsedModelRef {
  const parsed = readModelRef(ref);
  if (!parsed) throw new Error(`"${ref}" does not name a provider (provider:model)`);
  return parsed;
}

export function modelRef(provider: string, model: string): ModelRef {
  return `${provider}:${model}`;
}

/**
 * Brings a stored model up to date: ids saved before there were several
 * providers have no provider part and belong to `provider`.
 */
export function qualifyModel(value: string, provider: string): ModelRef {
  return REF.test(value) ? value : modelRef(provider, value);
}

/** `qualifyModel` for every entry of a layer. */
export function qualifyOverrides(overrides: ModelOverrides, provider: string): ModelOverrides {
  const qualified: Record<string, string> = {};
  for (const [modality, model] of Object.entries(overrides))
    if (model) qualified[modality] = qualifyModel(model, provider);
  return qualified;
}

/** Model references per modality, e.g. `{ text: 'openrouter:anthropic/claude-sonnet-5.5' }`. */
export type ModelOverrides = Partial<Record<Modality, string>>;

export interface ModelLayers {
  /** Core defaults per modality. */
  readonly defaults: ModelOverrides;
  readonly actor?: ModelOverrides | undefined;
  readonly skill?: ModelOverrides | undefined;
}

/** Resolves which model to use: skill override, then actor override, then core default. */
export function resolveModel(modality: Modality, layers: ModelLayers): string {
  const model = layers.skill?.[modality] ?? layers.actor?.[modality] ?? layers.defaults[modality];
  if (!model) throw new Error(`No model configured for modality "${modality}"`);
  return model;
}

/** A modality the app offers a default model for. Modules register the ones they use. */
export interface ModalityInfo {
  readonly id: Modality;
  readonly label: string;
  readonly description: string;
}

export const TEXT_MODALITY: ModalityInfo = {
  id: 'text',
  label: 'Text',
  description: 'Conversation, narration and every other text skill.',
};
export const IMAGE_MODALITY: ModalityInfo = {
  id: 'image',
  label: 'Image',
  description: 'Scene and character pictures from visualizer skills.',
};
export const AUDIO_MODALITY: ModalityInfo = {
  id: 'audio',
  label: 'Audio',
  description: 'Voices, sound and music from composer skills.',
};
