import { useSyncExternalStore } from 'react';
import type {
  ModalityInfo,
  Modality,
  ModelChoice,
  ModelOverrides,
  ReasoningEffort,
} from '@virtuocity/core';
import { REASONING_EFFORTS, modelChoice, qualifyModel, readModelChoice } from '@virtuocity/core';
import { listenerSet } from './listeners';

/** Settings live in this browser only; a provider's key never leaves it except to that provider. */
export interface Setting {
  readonly key: string;
  readonly fallback: string;
}

const KEY_PREFIX = 'virtuocity.key.';

/** The user's key for one provider. Keys are never saved to files or replaced by loading one. */
export function keySetting(providerId: string): Setting {
  return { key: `${KEY_PREFIX}${providerId}`, fallback: '' };
}

const isKey = (key: string) => key.startsWith(KEY_PREFIX);

/** Where the OpenRouter key was kept when it was the only provider. */
const OLD_OPENROUTER_KEY = 'virtuocity.openrouterKey';
export const THEME: Setting = { key: 'virtuocity.theme', fallback: 'system' };

const MODEL_PREFIX = 'virtuocity.model.';

/** Models used until one is picked; other modalities start unset. */
const FALLBACK_MODELS: Partial<Record<Modality, string>> = {
  text: 'openrouter:openrouter/auto',
  decisions: 'openrouter:~typesafe/jev-latest',
};

/** OpenRouter's auto router for text and Jev for decisions until a model is picked. */
export function modelSetting(modality: Modality): Setting {
  return { key: `${MODEL_PREFIX}${modality}`, fallback: FALLBACK_MODELS[modality] ?? '' };
}

/** Separate from model ids so existing browser settings stay compatible. */
export function reasoningSetting(modality: Modality): Setting {
  return { key: `virtuocity.reasoning.${modality}`, fallback: '' };
}

function validEffort(value: string): ReasoningEffort | undefined {
  return REASONING_EFFORTS.find((effort) => effort === value);
}

const memory = new Map<string, string>();
const changes = listenerSet();

export function readSetting(setting: Setting): string {
  try {
    return localStorage.getItem(setting.key) || setting.fallback;
  } catch {
    return memory.get(setting.key) || setting.fallback;
  }
}

export function writeSetting(setting: Setting, value: string): void {
  try {
    localStorage.setItem(setting.key, value);
  } catch {
    // Storage can be unavailable (private mode); the value then lasts for this page only.
    memory.set(setting.key, value);
  }
  changes.notify();
}

/** A setting as React state that stays in sync across components. */
export function useSetting(setting: Setting): [string, (value: string) => void] {
  const value = useSyncExternalStore(changes.subscribe, () => readSetting(setting));
  return [value, (next) => writeSetting(setting, next)];
}

/** The core default layer: one model per registered modality, unset ones left out. */
export function readModelDefaults(modalities: readonly ModalityInfo[]): ModelOverrides {
  const defaults: Record<string, ModelChoice> = {};
  for (const { id } of modalities) {
    const model = readSetting(modelSetting(id));
    if (model) defaults[id] = modelChoice(model, validEffort(readSetting(reasoningSetting(id))));
  }
  return defaults;
}

export function writeModelDefaults(
  modalities: readonly ModalityInfo[],
  value: ModelOverrides,
): void {
  for (const { id } of modalities) {
    const selected = readModelChoice(value[id]);
    writeSetting(modelSetting(id), selected?.model ?? '');
    writeSetting(reasoningSetting(id), selected?.reasoningEffort ?? '');
  }
}

/** Re-renders when any setting changes and returns the current default layer. */
export function useModelDefaults(modalities: readonly ModalityInfo[]): ModelOverrides {
  useSyncExternalStore(changes.subscribe, () =>
    modalities
      .map((m) => `${readSetting(modelSetting(m.id))}|${readSetting(reasoningSetting(m.id))}`)
      .join('|'),
  );
  return readModelDefaults(modalities);
}

/** The skill tags last picked in the Library, as a JSON list of skill ids. */
export const LIBRARY_TAGS: Setting = { key: 'virtuocity.library.tags', fallback: '[]' };

const PREFIX = 'virtuocity.';

function settingKeys(): string[] {
  try {
    return Object.keys(localStorage).filter((k) => k.startsWith(PREFIX));
  } catch {
    return [...memory.keys()];
  }
}

function removeSetting(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    memory.delete(key);
  }
}

/** Every stored setting except the provider keys, which never leave this browser. */
export function readAllSettings(): Record<string, string> {
  const all: Record<string, string> = {};
  for (const key of settingKeys()) {
    if (!isKey(key)) all[key] = readSetting({ key, fallback: '' });
  }
  return all;
}

/** Replaces every stored setting except the provider keys, which stay as they are. */
export function replaceAllSettings(values: Record<string, string>): void {
  for (const key of settingKeys()) if (!isKey(key)) removeSetting(key);
  for (const [key, value] of Object.entries(values)) {
    if (key.startsWith(PREFIX) && !isKey(key) && key !== OLD_OPENROUTER_KEY)
      writeSetting({ key, fallback: '' }, value);
  }
  upgradeSettings();
}

/**
 * Brings stored settings up to date: the OpenRouter key moves next to the
 * other provider keys, and default models saved without a provider belong to OpenRouter.
 */
export function upgradeSettings(): void {
  const old = readSetting({ key: OLD_OPENROUTER_KEY, fallback: '' });
  if (old) writeSetting(keySetting('openrouter'), old);
  removeSetting(OLD_OPENROUTER_KEY);
  for (const key of settingKeys().filter((k) => k.startsWith(MODEL_PREFIX))) {
    const value = readSetting({ key, fallback: '' });
    if (value) writeSetting({ key, fallback: '' }, qualifyModel(value, 'openrouter'));
  }
}

/** Re-renders when any setting changes. */
export const subscribeSettings = changes.subscribe;
