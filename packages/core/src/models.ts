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
