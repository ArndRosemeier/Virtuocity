import type { CSSProperties } from 'react';
import { cx } from './cx';

const HUES = 8;

/** Stable hue index for a name, so a character keeps its color everywhere. */
export function hueIndex(name: string): number {
  let hash = 0;
  for (const char of name) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return hash % HUES;
}

export function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  const letters =
    words.length > 1 ? [words[0], words[words.length - 1]] : [name.trim().slice(0, 2)];
  return (
    letters
      .map((w) => (w ?? '').charAt(0))
      .join('')
      .toUpperCase() || '?'
  );
}

export function Avatar({ name, size = 'md' }: { name: string; size?: 'md' | 'lg' }) {
  const style = { '--avatar-hue': `var(--hue-${hueIndex(name)})` } as CSSProperties;
  return (
    <span className={cx('v-avatar', size === 'lg' && 'v-avatar--lg')} style={style} aria-hidden>
      {initials(name)}
    </span>
  );
}
