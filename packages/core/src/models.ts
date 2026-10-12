/** Kinds of output a model can produce. Open-ended so modules can add more. */
export type Modality = 'text' | 'image' | 'audio' | 'music' | (string & {});

/** Model ids per modality, e.g. `{ text: 'anthropic/claude-sonnet-5.5' }`. */
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
