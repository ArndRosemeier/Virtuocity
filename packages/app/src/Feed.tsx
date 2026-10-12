import type { SessionRuntime } from '@virtuocity/core';
import type { AppHost } from './types';
import { StatsBadge } from './StatsBadge';

/** The story: the active path of the message tree, drawn through the renderer registry. */
export function Feed({ host, session }: { host: AppHost; session: SessionRuntime }) {
  const nameOf = (id: string) => session.actors.find((a) => a.id === id)?.personality.name ?? id;
  return (
    <main className="feed">
      {session.messages.activePath().map((m) => (
        <article key={m.id}>
          <h3>{nameOf(m.actorId)}</h3>
          {m.parts.map((part, i) => (
            <div key={i}>{host.renderers.render(part)}</div>
          ))}
          {m.stats && <StatsBadge stats={m.stats} />}
        </article>
      ))}
    </main>
  );
}
