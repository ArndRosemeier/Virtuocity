import type { CallStats, OutputPart } from '@virtuocity/core';
import type { ChatView } from '@virtuocity/contract-render';
import { Fragment, useState } from 'react';
import { Avatar, IconButton } from '@virtuocity/ui';
import { useActorTips } from './actorTips';
import { MessageEditor } from './MessageEdit';
import { openSpace } from './openSpaces';
import { useMessageActions } from './messageActions';
import { StatsBadge } from './StatsBadge';
import { Stepper } from './Stepper';
import type { AppHost } from './types';

interface MessageViewProps {
  readonly host: AppHost;
  readonly name: string;
  /** Hover text on the speaker's avatar and name: what the actor is. */
  readonly tip?: string | undefined;
  readonly part: OutputPart;
  readonly human?: boolean;
  readonly stats?: readonly CallStats[] | undefined;
  readonly live?: boolean;
  /** Offers a retry button; it is disabled while `busy`. */
  readonly retry?: { readonly run: () => void; readonly busy: boolean } | undefined;
  /** Offers an edit button for the message's text; it is disabled while `busy`. */
  readonly edit?: MessageEdit | undefined;
  /** Offers a delete button; it is disabled while `busy`. */
  readonly remove?: { readonly run: () => void; readonly busy: boolean } | undefined;
  /** A retried message's versions, with a picker to show another one. */
  readonly versions?: MessageVersionPick | undefined;
}

interface MessageVersionPick {
  readonly index: number;
  readonly count: number;
  readonly show: (index: number) => void;
  readonly busy: boolean;
}

interface MessageEdit {
  readonly text: string;
  readonly save: (text: string) => void;
  readonly busy: boolean;
}

/** Retry, Edit and Delete for one message, each shown only when offered. */
function MessageButtons({
  retry,
  edit,
  remove,
  onEdit,
}: Pick<MessageViewProps, 'retry' | 'edit' | 'remove'> & { onEdit: () => void }) {
  return (
    <>
      {retry && (
        <IconButton
          size="sm"
          icon="restart"
          label="Retry: answer again; this answer stays as an earlier version"
          disabled={retry.busy}
          onClick={retry.run}
        />
      )}
      {edit && (
        <IconButton
          size="sm"
          icon="edit"
          label="Edit this message"
          disabled={edit.busy}
          onClick={onEdit}
        />
      )}
      {remove && (
        <IconButton
          size="sm"
          icon="trash"
          label="Delete this message; everything after it stays"
          disabled={remove.busy}
          onClick={remove.run}
        />
      )}
    </>
  );
}

/** One message under its speaker's name, its content drawn by the renderer for its kind. */
export function MessageView({
  host,
  name,
  tip,
  part,
  human = false,
  stats,
  live = false,
  retry,
  edit,
  remove,
  versions,
}: MessageViewProps) {
  const [editing, setEditing] = useState(false);
  return (
    <article
      className={live ? 'message message--live' : 'message'}
      data-human={human}
      {...(live ? { 'aria-live': 'polite' } : {})}
    >
      <Avatar name={name} size="lg" title={tip} />
      <div className="message__body">
        <header className="message__header">
          <h3 className="message__name" title={tip}>
            {name}
          </h3>
          {stats && <StatsBadge stats={stats} />}
          {versions && <Stepper {...versions} noun="version" />}
          <MessageButtons
            retry={retry}
            edit={editing ? undefined : edit}
            remove={remove}
            onEdit={() => setEditing(true)}
          />
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
  const tipOf = useActorTips();
  const retryOf = (id: string) =>
    actions?.canRetry(id) ? { run: () => actions.retry(id), busy: actions.busy } : undefined;
  const editOf = (id: string) => {
    const text = actions?.editableText(id);
    if (!actions || text === undefined) return undefined;
    return { text, save: (t: string) => actions.edit(id, t), busy: actions.busy };
  };
  const versionsOf = (id: string) => {
    const found = actions?.versions(id);
    if (!actions || !found) return undefined;
    return { ...found, show: (i: number) => actions.showVersion(id, i), busy: actions.busy };
  };
  return (
    <>
      {view.entries.map((entry) => (
        <Fragment key={entry.id}>
          <MessageView
            host={host}
            name={entry.name}
            tip={tipOf(entry.actorId)}
            part={entry.part}
            human={entry.human}
            stats={entry.stats}
            retry={retryOf(entry.id)}
            edit={editOf(entry.id)}
            versions={versionsOf(entry.id)}
            remove={
              actions ? { run: () => actions.remove(entry.id), busy: actions.busy } : undefined
            }
          />
          {entry.markers?.map((marker) => (
            <StoryMarkerLine key={marker.actorId} label={marker.label} actorId={marker.actorId} />
          ))}
        </Fragment>
      ))}
    </>
  );
}
