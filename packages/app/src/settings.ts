const KEY = 'virtuocity.openrouterKey';

/** The OpenRouter key stays in this browser only. */
export function readApiKey(): string {
  try {
    return localStorage.getItem(KEY) ?? '';
  } catch {
    return '';
  }
}

export function writeApiKey(value: string): void {
  try {
    localStorage.setItem(KEY, value);
  } catch {
    // Storage can be unavailable (private mode); the key then lives for this page only.
  }
}
