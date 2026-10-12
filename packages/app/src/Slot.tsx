import { useState } from 'react';
import { arrangeSlot, currentBlueprint } from '@virtuocity/core';
import { ResizeHandle } from './ResizeHandle';
import type { AppHost, PanelProps } from './types';

type Contribution = ReturnType<AppHost['panels']['list']>[number];

/** What a slot shows: what the session's blueprint lays out there, or everything. */
export function contributions({ host, session }: PanelProps, slot: string): Contribution[] {
  const layout = currentBlueprint(session, host.blueprints)?.layout;
  return arrangeSlot(host.panels.list(), slot, layout);
}

/** Side panels, stacked with their titles, with a resize edge; nothing at all when the slot is empty. */
export function Slot({ name, host, session }: PanelProps & { name: string }) {
  const items = contributions({ host, session }, name);
  if (items.length === 0) return null;
  return (
    <>
      <aside className={`slot slot--${name}`}>
        {items.map(({ id, title, component: Panel }) => (
          <section key={id} className="panel">
            <h2 className="panel__title">{title}</h2>
            <Panel session={session} host={host} />
          </section>
        ))}
      </aside>
      <ResizeHandle slot={name} />
    </>
  );
}

/** Views or controls that fill an area; with several, tabs switch between them. */
export function Area({ name, host, session }: PanelProps & { name: string }) {
  const items = contributions({ host, session }, name);
  const [picked, setPicked] = useState<string>();
  const current = items.find((i) => i.id === picked) ?? items[0];
  return (
    <div className={`slot slot--${name}`}>
      {items.length > 1 && (
        <nav className="views" role="tablist" aria-label={`${name} views`}>
          {items.map((item) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              className="views__tab"
              aria-selected={item.id === current?.id}
              onClick={() => setPicked(item.id)}
            >
              {item.title}
            </button>
          ))}
        </nav>
      )}
      {current && <current.component session={session} host={host} />}
    </div>
  );
}
