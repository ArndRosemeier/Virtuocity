import { useEffect, useRef } from 'react';
import type { Message } from '@virtuocity/core';
import { Avatar, Button, EmptyState } from '@virtuocity/ui';
import { useAppActions } from './actions';
import { USER_ID } from './useSession';
import { API_KEY, useSetting } from './settings';
import { StatsBadge } from './StatsBadge';
import type { PanelProps } from './types';

function Welcome({ session }: Pick<PanelProps, 'session'>) {
  const { openSettings, openNewActor, openNewSession } = useAppActions();
  const [key] = useSetting(API_KEY);
  if (!key) {
    return (
      <EmptyState
        icon="key"
        title="Light the lantern"
        action={
          <Button variant="primary" icon="settings" onClick={() => openSettings('connection')}>
            Connect OpenRouter
          </Button>
        }
      >
        Add your OpenRouter key to bring actors to life. It stays in this browser.
      </EmptyState>
    );
  }
  if (session.speakers().length === 0) {
    return (
      <EmptyState
        icon="users"
        title="Set the scene"
        action={
          <>
            <Button variant="primary" icon="sparkles" onClick={openNewSession}>
              Pick a setup
            </Button>
            <Button icon="plus" onClick={openNewActor}>
              Add an actor
            </Button>
          </>
        }
      >
        Start from a ready-made setup, or create your own actors.
      </EmptyState>
    );
  }
  return (
    <EmptyState icon="lantern" title="Your story starts here">
      Write the first line below, or pass and let an actor begin.
    </EmptyState>
  );
}

function MessageView({
  message,
  name,
  host,
  live = false,
}: {
  message: Message;
  name: string;
  host: PanelProps['host'];
  live?: boolean;
}) {
  return (
    <article
      className={live ? 'message message--live' : 'message'}
      data-human={message.actorId === USER_ID}
      {...(live ? { 'aria-live': 'polite' } : {})}
    >
      <Avatar name={name} size="lg" />
      <div className="message__body">
        <header className="message__header">
          <h3 className="message__name">{name}</h3>
          {message.stats && <StatsBadge stats={message.stats} />}
        </header>
        {message.parts.map((part, i) => (
          <div key={i}>{host.renderers.render(part)}</div>
        ))}
      </div>
    </article>
  );
}

/** What the speaking actor is writing right now, as it streams in. */
function Live({ host, session, actorId, name }: PanelProps & { actorId: string; name: string }) {
  const call = session.calls.running(actorId).at(-1);
  const text = call?.text.trim() ?? '';
  if (!call || !text) {
    return (
      <div className="typing">
        <Avatar name={name} />
        <span>{name} is writing</span>
        <span className="typing__dots" aria-hidden>
          <i />
          <i />
          <i />
        </span>
      </div>
    );
  }
  const draft: Message = {
    id: call.id,
    actorId,
    parts: [{ kind: 'text', data: text }],
    createdAt: call.startedAt,
  };
  return <MessageView message={draft} name={name} host={host} live />;
}

/** The story: the active path of the message tree, drawn through the renderer registry. */
export function Feed({ host, session }: PanelProps) {
  const end = useRef<HTMLDivElement>(null);
  const messages = session.transcript(USER_ID);
  const nameOf = (id: string) => session.actors.find((a) => a.id === id)?.personality.name ?? id;
  const speaking = session.speaking;
  const live = speaking ? (session.calls.running(speaking).at(-1)?.text.length ?? 0) : 0;

  useEffect(
    () => end.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }),
    [messages.length, speaking, live],
  );

  return (
    <main className="feed">
      <div className="feed__inner">
        {messages.length === 0 && !speaking && <Welcome session={session} />}
        {messages.map((m) => (
          <MessageView key={m.id} message={m} name={nameOf(m.actorId)} host={host} />
        ))}
        {speaking && (
          <Live host={host} session={session} actorId={speaking} name={nameOf(speaking)} />
        )}
        <div ref={end} />
      </div>
    </main>
  );
}
