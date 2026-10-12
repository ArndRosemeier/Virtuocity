import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cx } from './cx';
import type { IconName } from './Icon';
import { Icon } from './Icon';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  readonly variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  readonly size?: 'sm' | 'md';
  readonly icon?: IconName;
  readonly children?: ReactNode;
}

export function Button({
  variant = 'secondary',
  size = 'md',
  icon,
  children,
  className,
  ...rest
}: ButtonProps) {
  return (
    <button
      type="button"
      className={cx('v-btn', `v-btn--${variant}`, size === 'sm' && 'v-btn--sm', className)}
      {...rest}
    >
      {icon && <Icon name={icon} />}
      {children}
    </button>
  );
}

/** A square button with only an icon; `label` is required for screen readers and the tooltip. */
export function IconButton({
  label,
  icon,
  ...rest
}: Omit<ButtonProps, 'children'> & { label: string; icon: IconName }) {
  return (
    <Button
      variant="ghost"
      {...rest}
      className={cx('v-btn--icon', rest.className)}
      aria-label={label}
      title={label}
    >
      <Icon name={icon} />
    </Button>
  );
}
