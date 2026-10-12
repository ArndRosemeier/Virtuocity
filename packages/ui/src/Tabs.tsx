import type { ReactNode } from 'react';
import type { IconName } from './Icon';
import { Icon } from './Icon';

export interface TabDef {
  readonly id: string;
  readonly label: string;
  readonly icon?: IconName;
  readonly content: () => ReactNode;
}

/** Vertical navigation for dialogs with several sections, like settings. */
export function Tabs({
  tabs,
  active,
  onChange,
}: {
  tabs: readonly TabDef[];
  active: string;
  onChange: (id: string) => void;
}) {
  const current = tabs.find((t) => t.id === active) ?? tabs[0];
  return (
    <div className="v-tabs">
      <div className="v-tabs__list" role="tablist" aria-orientation="vertical">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            className="v-tabs__tab"
            aria-selected={tab.id === current?.id}
            onClick={() => onChange(tab.id)}
          >
            {tab.icon && <Icon name={tab.icon} />}
            {tab.label}
          </button>
        ))}
      </div>
      <div className="v-tabs__panel" role="tabpanel">
        {current?.content()}
      </div>
    </div>
  );
}

export function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="v-section">
      <h3 className="v-section__title">{title}</h3>
      {children}
    </section>
  );
}
