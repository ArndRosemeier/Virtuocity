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

/** Optional reasoning effort; omitted means the provider's model default. */
export const REASONING_EFFORTS = [
  'none',
  'minimal',
  'low',
  'medium',
  'high',
  'xhigh',
  'max',
] as const;
export type ReasoningEffort = (typeof REASONING_EFFORTS)[number];

/** Backwards compatible with model ids already stored as plain strings. */
export interface ModelSelection {
  readonly model: ModelRef;
  readonly reasoningEffort?: ReasoningEffort;
}
export type ModelChoice = ModelRef | ModelSelection;

export function readModelChoice(choice: ModelChoice | undefined): ModelSelection | undefined {
  return typeof choice === 'string' ? { model: choice } : choice;
}

export function modelChoice(model: ModelRef, reasoningEffort?: ReasoningEffort): ModelChoice {
  return reasoningEffort ? { model, reasoningEffort } : model;
}

/** `qualifyModel` for every entry of a layer. */
export function qualifyOverrides(overrides: ModelOverrides, provider: string): ModelOverrides {
  const qualified: Record<string, ModelChoice> = {};
  for (const [modality, choice] of Object.entries(overrides)) {
    const selected = readModelChoice(choice);
    if (selected?.model)
      qualified[modality] = modelChoice(
        qualifyModel(selected.model, provider),
        selected.reasoningEffort,
      );
  }
  return qualified;
}

/** Model choices per modality, optionally including reasoning effort. */
export type ModelOverrides = Partial<Record<Modality, ModelChoice>>;

export interface ModelLayers {
  /** Core defaults per modality. */
  readonly defaults: ModelOverrides;
  readonly actor?: ModelOverrides | undefined;
  readonly skill?: ModelOverrides | undefined;
}

/** Skill choice beats actor choice, which beats the default; effort follows its model. */
export function resolveModelSelection(modality: Modality, layers: ModelLayers): ModelSelection {
  const choice = layers.skill?.[modality] ?? layers.actor?.[modality] ?? layers.defaults[modality];
  const selected = readModelChoice(choice);
  if (!selected?.model) throw new Error(`No model configured for modality "${modality}"`);
  return selected;
}

/** Compatibility helper for callers needing only the model reference. */
export function resolveModel(modality: Modality, layers: ModelLayers): string {
  return resolveModelSelection(modality, layers).model;
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
