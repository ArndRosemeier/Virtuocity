import { useEffect } from 'react';
import { THEME, useSetting } from './settings';

export type ThemeChoice = 'system' | 'dark' | 'light';

const DARK_QUERY = '(prefers-color-scheme: dark)';

function resolve(choice: string): 'dark' | 'light' {
  if (choice === 'dark' || choice === 'light') return choice;
  return window.matchMedia(DARK_QUERY).matches ? 'dark' : 'light';
}

/** Keeps `data-theme` on <html> in sync with the setting and, for "system", the OS. */
export function useTheme(): void {
  const [choice] = useSetting(THEME);
  useEffect(() => {
    const apply = () => {
      document.documentElement.dataset.theme = resolve(choice);
    };
    apply();
    const media = window.matchMedia(DARK_QUERY);
    media.addEventListener('change', apply);
    return () => media.removeEventListener('change', apply);
  }, [choice]);
}
