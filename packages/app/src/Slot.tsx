import { currentBlueprint } from '@virtuocity/core';
import type { AppHost, PanelProps } from './types';

type Panel = ReturnType<AppHost['panels']['list']>[number];

/** The panels of a slot, in the order the session's blueprint asks for, or all of them. */
function panelsFor({ host, session }: PanelProps, slot: string): Panel[] {
  const panels = host.panels.list().filter((p) => p.slot === slot);
  const wanted = currentBlueprint(session, host.blueprints)?.layout?.panels;
  if (!wanted) return panels;
  return wanted.flatMap((id) => panels.filter((p) => p.id === id));
}

/** A UI area that shows the panels modules contributed to it. */
export function Slot({ name, host, session }: PanelProps & { name: string }) {
  return (
    <aside className={`slot slot--${name}`}>
      {panelsFor({ host, session }, name).map(({ id, title, component: Panel }) => (
        <section key={id} className="panel">
          <h2 className="panel__title">{title}</h2>
          <Panel session={session} host={host} />
        </section>
      ))}
    </aside>
  );
}
