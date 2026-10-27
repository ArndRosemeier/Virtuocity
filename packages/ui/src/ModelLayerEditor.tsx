import type { ModalityInfo, ModelChoice, ModelOverrides } from '@virtuocity/core';
import { modelChoice, readModelChoice } from '@virtuocity/core';
import { Field } from './Field';
import type { ProviderCatalog } from './ProviderModelPicker';
import { ProviderModelPicker } from './ProviderModelPicker';

export interface ModelLayerEditorProps {
  /** Modalities to offer a picker for. */
  readonly modalities: readonly ModalityInfo[];
  /** The providers that are ready to use, each with its catalog. */
  readonly providers: readonly ProviderCatalog[];
  /** One model reference per modality; a missing entry means "inherit". */
  readonly value: ModelOverrides;
  readonly onChange: (next: ModelOverrides) => void;
  /** What "no entry" means at this layer, e.g. "Use the default". */
  readonly inheritLabel: string;
}

/**
 * Edits one layer of model choices (core defaults, an actor's overrides or a
 * skill's overrides) with one picker per modality. Every layer uses this.
 */
export function ModelLayerEditor({
  modalities,
  providers,
  value,
  onChange,
  inheritLabel,
}: ModelLayerEditorProps) {
  const set = (modality: string, choice: ModelChoice | undefined) => {
    const next: Record<string, ModelChoice> = {};
    for (const [key, existing] of Object.entries(value))
      if (existing && key !== modality) next[key] = existing;
    if (choice) next[modality] = choice;
    onChange(next);
  };
  return (
    <>
      {modalities.map((modality) => {
        const selected = readModelChoice(value[modality.id]);
        return (
          <Field key={modality.id} label={modality.label} hint={modality.description}>
            {(id) => (
              <ProviderModelPicker
                id={id}
                providers={providers}
                modality={modality.id}
                value={selected?.model}
                onChange={(model) =>
                  set(modality.id, model ? modelChoice(model, selected?.reasoningEffort) : undefined)
                }
                reasoningEffort={selected?.reasoningEffort}
                onReasoningEffortChange={(effort) => {
                  if (selected) set(modality.id, modelChoice(selected.model, effort));
                }}
                defaultLabel={inheritLabel}
              />
            )}
          </Field>
        );
      })}
    </>
  );
}
