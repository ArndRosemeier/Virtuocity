import type { ReactNode } from 'react';
import { cx } from './cx';

export function Pill({
  children,
  tone,
  title,
}: {
  children: ReactNode;
  tone?: 'accent';
  title?: string;
}) {
  return (
    <span className={cx('v-pill', tone && `v-pill--${tone}`)} title={title}>
      {children}
    </span>
  );
}
