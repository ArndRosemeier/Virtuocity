import type { CallStats, OutputPart } from '@virtuocity/core';
import type { ChatView } from '@virtuocity/contract-render';
import { Avatar, IconButton } from '@virtuocity/ui';
import { useMessageActions } from './messageActions';
import { StatsBadge } from './StatsBadge';
import type { AppHost } from './types';

interface MessageViewProps {
  readonly host: AppHost;
  readonly name: string;
  readonly part: OutputPart;
  readonly human?: boolean;
  readonly stats?: readonly CallStats[] | undefined;
  readonly live?: boolean;
  /** Offers a retry button; it is disabled while `busy`. */
  readonly retry?: { readonly run: () => void; readonly busy: boolean } | undefined;
}

/** One message under its speaker's name, its content drawn by the renderer for its kind. */
export function MessageView({
  host,
  name,
  part,
  human = false,
  stats,
  live = false,
  retry,
}: MessageViewProps) {
  return (
    <article
      className={live ? 'message message--live' : 'message'}
      data-human={human}
      {...(live ? { 'aria-live': 'polite' } : {})}
    >
      <Avatar name={name} size="lg" />
      <div className="message__body">
        <header className="message__header">
          <h3 className="message__name">{name}</h3>
          {stats && <StatsBadge stats={stats} />}
          {retry && (
            <IconButton
              size="sm"
              icon="restart"
              label="Retry: drop this and everything after it, then answer again"
              disabled={retry.busy}
              onClick={retry.run}
            />
          )}
        </header>
        {host.renderers.render(part)}
      </div>
    </article>
  );
}

/** The chat view's output: the story as a column of messages. */
export function ChatViewPart({ host, view }: { host: AppHost; view: ChatView }) {
  const actions = useMessageActions();
  const retryOf = (id: string) =>
    actions?.canRetry(id) ? { run: () => actions.retry(id), busy: actions.busy } : undefined;
  return (
    <>
      {view.entries.map((entry) => (
        <MessageView
          key={entry.id}
          host={host}
          name={entry.name}
          part={entry.part}
          human={entry.human}
          stats={entry.stats}
          retry={retryOf(entry.id)}
        />
      ))}
    </>
  );
}
