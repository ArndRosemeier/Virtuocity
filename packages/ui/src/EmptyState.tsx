import type { ReactNode } from 'react';
import type { IconName } from './Icon';
import { Icon } from './Icon';

export function EmptyState({
  icon,
  title,
  children,
  action,
}: {
  icon: IconName;
  title: string;
  children?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="v-empty">
      <div className="v-empty__glyph">
        <Icon name={icon} />
      </div>
      <h2 className="v-empty__title">{title}</h2>
      {children && <p className="v-empty__body">{children}</p>}
      {action}
    </div>
  );
}
