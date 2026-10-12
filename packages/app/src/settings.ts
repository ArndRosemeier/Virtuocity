/** Settings live in this browser only; the OpenRouter key never leaves it except to OpenRouter. */
export interface Setting {
  readonly key: string;
  readonly fallback: string;
}

export const API_KEY: Setting = { key: 'virtuocity.openrouterKey', fallback: '' };
/** OpenRouter's auto router until a model is picked. */
export const TEXT_MODEL: Setting = { key: 'virtuocity.model.text', fallback: 'openrouter/auto' };

export function readSetting(setting: Setting): string {
  try {
    return localStorage.getItem(setting.key) || setting.fallback;
  } catch {
    return setting.fallback;
  }
}

export function writeSetting(setting: Setting, value: string): void {
  try {
    localStorage.setItem(setting.key, value);
  } catch {
    // Storage can be unavailable (private mode); the value then lasts for this page only.
  }
}
