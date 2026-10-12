import type { PanelProps } from './types';

/** A UI area that shows every panel modules contributed to it. */
export function Slot({ name, host, session }: PanelProps & { name: string }) {
  return (
    <aside className={`slot slot--${name}`}>
      {host.panels
        .list()
        .filter((p) => p.slot === name)
        .map(({ id, title, component: Panel }) => (
          <section key={id} className="panel">
            <h2 className="panel__title">{title}</h2>
            <Panel session={session} host={host} />
          </section>
        ))}
    </aside>
  );
}
