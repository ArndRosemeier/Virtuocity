import { useState } from 'react';
import type { Modality, ModelInfo, ReasoningEffort } from '@virtuocity/core';
import { REASONING_EFFORTS, modelRef, modelsFor, readModelRef } from '@virtuocity/core';
import { ModelPicker } from './ModelPicker';

export interface ModelCatalogState {
  readonly models: readonly ModelInfo[];
  readonly loading: boolean;
  readonly error?: string | undefined;
}

/** A provider the pickers offer, with its model catalog. */
export interface ProviderCatalog {
  readonly id: string;
  readonly name: string;
  readonly catalog: ModelCatalogState;
}

export interface ProviderModelPickerProps {
  /** The providers that are ready to use. */
  readonly providers: readonly ProviderCatalog[];
  readonly modality: Modality;
  /** A model reference (`provider:model`); `undefined` means "use the default". */
  readonly value: string | undefined;
  readonly onChange: (ref: string | undefined) => void;
  readonly reasoningEffort?: ReasoningEffort | undefined;
  readonly onReasoningEffortChange?: ((effort: ReasoningEffort | undefined) => void) | undefined;
  /** Label of the "no override" choice; omit to make a model required. */
  readonly defaultLabel?: string | undefined;
  readonly id?: string | undefined;
}

const NO_CATALOG: ModelCatalogState = { models: [], loading: false };

function ProviderSelect({
  providers,
  value,
  known,
  onChange,
}: {
  providers: readonly ProviderCatalog[];
  value: string;
  known: boolean;
  onChange: (id: string) => void;
}) {
  return (
    <select
      className="v-input v-provider-picker__provider"
      aria-label="Provider"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    >
      {!known && <option value={value}>{value ? `${value} (no key)` : 'No provider'}</option>}
      {providers.map((p) => (
        <option key={p.id} value={p.id}>
          {p.name}
        </option>
      ))}
    </select>
  );
}

/** Text-model-specific effort control, shared by defaults and actor model pickers. */
function ReasoningPicker({
  providerId,
  modality,
  model,
  effort,
  onChange,
}: {
  providerId: string;
  modality: Modality;
  model: string | undefined;
  effort: ReasoningEffort | undefined;
  onChange: ((effort: ReasoningEffort | undefined) => void) | undefined;
}) {
  if (modality !== 'text' || !onChange) return null;
  const options = REASONING_EFFORTS.filter(
    (value) => providerId !== 'anthropic' || (value !== 'none' && value !== 'minimal'),
  );
  return (
    <label className="v-provider-picker__reasoning">
      <span>Reasoning effort</span>
      <select
        className="v-input"
        aria-label="Reasoning effort"
        value={effort ?? ''}
        disabled={!model}
        title="Only reasoning-capable models accept this setting; supported levels vary by model."
        onChange={(e) => onChange((e.target.value || undefined) as ReasoningEffort | undefined)}
      >
        <option value="">Model default</option>
        {options.map((value) => (
          <option key={value} value={value}>
            {value[0]?.toUpperCase()}{value.slice(1)}
          </option>
        ))}
      </select>
    </label>
  );
}

/** Two steps: first the provider, then one of its models for the modality. */
export function ProviderModelPicker(props: ProviderModelPickerProps) {
  const current = props.value === undefined ? undefined : readModelRef(props.value);
  const [chosen, setChosen] = useState(current?.provider ?? props.providers[0]?.id ?? '');
  const providerId = current?.provider ?? chosen;
  const provider = props.providers.find((p) => p.id === providerId);
  const catalog = provider?.catalog ?? NO_CATALOG;
  const pickProvider = (id: string) => {
    setChosen(id);
    if (current && current.provider !== id) props.onChange(undefined);
  };
  return (
    <div className="v-provider-picker">
      <ProviderSelect
        providers={props.providers}
        value={providerId}
        known={provider !== undefined}
        onChange={pickProvider}
      />
      <ModelPicker
        id={props.id}
        models={modelsFor(catalog.models, props.modality)}
        value={current?.model}
        onChange={(model) => props.onChange(model ? modelRef(providerId, model) : undefined)}
        loading={catalog.loading}
        error={provider ? catalog.error : 'Add a key for this provider in Settings'}
        defaultLabel={props.defaultLabel}
      />
      <ReasoningPicker
        providerId={providerId}
        modality={props.modality}
        model={current?.model}
        effort={props.reasoningEffort}
        onChange={props.onReasoningEffortChange}
      />
    </div>
  );
}
