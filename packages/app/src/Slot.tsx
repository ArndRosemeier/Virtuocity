import type { SessionRuntime } from '@virtuocity/core';
import type { AppHost } from './types';

/** A UI area that shows every panel modules contributed to it. */
export function Slot({
  host,
  name,
  session,
}: {
  host: AppHost;
  name: string;
  session: SessionRuntime;
}) {
  return (
    <aside className={`slot-${name}`}>
      {host.panels
        .list()
        .filter((p) => p.slot === name)
        .map(({ id, title, component: Panel }) => (
          <section key={id}>
            <h2>{title}</h2>
            <Panel session={session} />
          </section>
        ))}
    </aside>
  );
}
