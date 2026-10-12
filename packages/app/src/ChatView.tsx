import type { CallStats, OutputPart } from '@virtuocity/core';
import type { ChatView } from '@virtuocity/contract-render';
import { Fragment, useState } from 'react';
import { Avatar, IconButton } from '@virtuocity/ui';
import { MessageEditor } from './MessageEdit';
import { openSpace } from './openSpaces';
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
  /** Offers an edit button for the message's text; it is disabled while `busy`. */
  readonly edit?: MessageEdit | undefined;
}

interface MessageEdit {
  readonly text: string;
  readonly save: (text: string) => void;
  readonly busy: boolean;
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
  edit,
}: MessageViewProps) {
  const [editing, setEditing] = useState(false);
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
          {edit && !editing && (
            <IconButton
              size="sm"
              icon="edit"
              label="Edit this message"
              disabled={edit.busy}
              onClick={() => setEditing(true)}
            />
          )}
        </header>
        {edit && editing ? (
          <MessageEditor
            text={edit.text}
            onCancel={() => setEditing(false)}
            onSave={(text) => {
              setEditing(false);
              edit.save(text);
            }}
          />
        ) : (
          host.renderers.render(part)
        )}
      </div>
    </article>
  );
}

/** A small labeled line between messages; clicking it opens the placing actor's space. */
function StoryMarkerLine({ label, actorId }: { label: string; actorId: string }) {
  return (
    <button type="button" className="story-marker" onClick={() => openSpace(actorId)}>
      {label}
    </button>
  );
}

/** The chat view's output: the story as a column of messages. */
export function ChatViewPart({ host, view }: { host: AppHost; view: ChatView }) {
  const actions = useMessageActions();
  const retryOf = (id: string) =>
    actions?.canRetry(id) ? { run: () => actions.retry(id), busy: actions.busy } : undefined;
  const editOf = (id: string) => {
    const text = actions?.editableText(id);
    if (!actions || text === undefined) return undefined;
    return { text, save: (t: string) => actions.edit(id, t), busy: actions.busy };
  };
  return (
    <>
      {view.entries.map((entry) => (
        <Fragment key={entry.id}>
          <MessageView
            host={host}
            name={entry.name}
            part={entry.part}
            human={entry.human}
            stats={entry.stats}
            retry={retryOf(entry.id)}
            edit={editOf(entry.id)}
          />
          {entry.markers?.map((marker) => (
            <StoryMarkerLine key={marker.actorId} label={marker.label} actorId={marker.actorId} />
          ))}
        </Fragment>
      ))}
    </>
  );
}
