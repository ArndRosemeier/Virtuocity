import { useEffect, useRef } from 'react';
import type { Message } from '@virtuocity/core';
import { Avatar, Button, EmptyState } from '@virtuocity/ui';
import { useAppActions } from './actions';
import { API_KEY, useSetting } from './settings';
import { StatsBadge } from './StatsBadge';
import type { PanelProps } from './types';

function Welcome({ session }: Pick<PanelProps, 'session'>) {
  const { openSettings, openNewCharacter } = useAppActions();
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
        Add your OpenRouter key to bring characters to life. It stays in this browser.
      </EmptyState>
    );
  }
  if (session.speakers().length === 0) {
    return (
      <EmptyState
        icon="users"
        title="Set the scene"
        action={
          <Button variant="primary" icon="plus" onClick={openNewCharacter}>
            Add a character
          </Button>
        }
      >
        Create one or more characters, then write the opening line.
      </EmptyState>
    );
  }
  return (
    <EmptyState icon="lantern" title="Your story starts here">
      Write the first line below, or pass and let a character begin.
    </EmptyState>
  );
}

function MessageView({
  message,
  name,
  host,
}: {
  message: Message;
  name: string;
  host: PanelProps['host'];
}) {
  return (
    <article className="message" data-human={message.actorId === 'user'}>
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

/** The story: the active path of the message tree, drawn through the renderer registry. */
export function Feed({ host, session }: PanelProps) {
  const end = useRef<HTMLDivElement>(null);
  const messages = session.messages.activePath();
  const nameOf = (id: string) => session.actors.find((a) => a.id === id)?.personality.name ?? id;
  const speaking = session.speaking;

  useEffect(
    () => end.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }),
    [messages.length, speaking],
  );

  return (
    <main className="feed">
      <div className="feed__inner">
        {messages.length === 0 && !speaking && <Welcome session={session} />}
        {messages.map((m) => (
          <MessageView key={m.id} message={m} name={nameOf(m.actorId)} host={host} />
        ))}
        {speaking && (
          <div className="typing">
            <Avatar name={nameOf(speaking)} />
            <span>{nameOf(speaking)} is writing</span>
            <span className="typing__dots" aria-hidden>
              <i />
              <i />
              <i />
            </span>
          </div>
        )}
        <div ref={end} />
      </div>
    </main>
  );
}
