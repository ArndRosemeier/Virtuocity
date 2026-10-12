import { useSyncExternalStore } from 'react';
import type { ModalityInfo, Modality, ModelOverrides } from '@virtuocity/core';

/** Settings live in this browser only; the OpenRouter key never leaves it except to OpenRouter. */
export interface Setting {
  readonly key: string;
  readonly fallback: string;
}

export const API_KEY: Setting = { key: 'virtuocity.openrouterKey', fallback: '' };
export const THEME: Setting = { key: 'virtuocity.theme', fallback: 'system' };

/** OpenRouter's auto router until a text model is picked; other modalities start unset. */
export function modelSetting(modality: Modality): Setting {
  return {
    key: `virtuocity.model.${modality}`,
    fallback: modality === 'text' ? 'openrouter/auto' : '',
  };
}

const memory = new Map<string, string>();
const listeners = new Set<() => void>();

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
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** A setting as React state that stays in sync across components. */
export function useSetting(setting: Setting): [string, (value: string) => void] {
  const value = useSyncExternalStore(subscribe, () => readSetting(setting));
  return [value, (next) => writeSetting(setting, next)];
}

/** The core default layer: one model per registered modality, unset ones left out. */
export function readModelDefaults(modalities: readonly ModalityInfo[]): ModelOverrides {
  const defaults: Record<string, string> = {};
  for (const { id } of modalities) {
    const model = readSetting(modelSetting(id));
    if (model) defaults[id] = model;
  }
  return defaults;
}

export function writeModelDefaults(
  modalities: readonly ModalityInfo[],
  value: ModelOverrides,
): void {
  for (const { id } of modalities) writeSetting(modelSetting(id), value[id] ?? '');
}

/** Re-renders when any setting changes and returns the current default layer. */
export function useModelDefaults(modalities: readonly ModalityInfo[]): ModelOverrides {
  useSyncExternalStore(subscribe, () =>
    modalities.map((m) => readSetting(modelSetting(m.id))).join('|'),
  );
  return readModelDefaults(modalities);
}
