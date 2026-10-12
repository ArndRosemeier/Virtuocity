import { useState } from 'react';
import type { Modality, ModelInfo } from '@virtuocity/core';
import { modelRef, modelsFor, readModelRef } from '@virtuocity/core';
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
    </div>
  );
}
