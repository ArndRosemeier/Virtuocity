import type { AppHost } from './types';

/** A UI area that shows every panel modules contributed to it. */
export function Slot({ host, name }: { host: AppHost; name: string }) {
  return (
    <aside className={`slot-${name}`}>
      {host.panels
        .list()
        .filter((p) => p.slot === name)
        .map(({ id, title, component: Panel }) => (
          <section key={id}>
            <h2>{title}</h2>
            <Panel />
          </section>
        ))}
    </aside>
  );
}
