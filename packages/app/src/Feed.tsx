import type { Message } from '@virtuocity/core';
import type { AppHost } from './types';
import { StatsBadge } from './StatsBadge';

/** The story: the active path of the message tree, drawn through the renderer registry. */
export function Feed({ host, messages }: { host: AppHost; messages: readonly Message[] }) {
  return (
    <main className="feed">
      {messages.map((m) => (
        <article key={m.id}>
          {m.parts.map((part, i) => (
            <div key={i}>{host.renderers.render(part)}</div>
          ))}
          {m.stats && <StatsBadge stats={m.stats} />}
        </article>
      ))}
    </main>
  );
}
