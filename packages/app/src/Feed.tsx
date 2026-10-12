import { useEffect, useMemo, useRef } from 'react';
import type { SessionRuntime } from '@virtuocity/core';
import { retryMessage, retryable } from '@virtuocity/core';
import { renderContract } from '@virtuocity/contract-render';
import { Avatar, Button, EmptyState } from '@virtuocity/ui';
import { useAppActions } from './actions';
import { MessageView } from './ChatView';
import { runSafely } from './LibraryActors';
import type { MessageActions } from './messageActions';
import { MessageActionsContext } from './messageActions';
import { USER_ID } from './useSession';
import { API_KEY, useSetting } from './settings';
import { STORY_VIEW, ensureStoryView, storyView } from './storyView';
import type { AppModule, PanelProps } from './types';
import { useParts } from './useParts';

function Welcome({ session }: Pick<PanelProps, 'session'>) {
  const { openSettings, openAddActor, openNewSession } = useAppActions();
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
            <Button icon="plus" onClick={openAddActor}>
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
    <EmptyState icon="lantern" title="Your session starts here">
      Write the first line below, or pass and let an actor begin.
    </EmptyState>
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
  return <MessageView host={host} name={name} part={{ kind: 'text', data: text }} live />;
}

/** A story without a story view (e.g. rewound to before it had one) gets the default back. */
function NoStoryView({ host, session }: PanelProps) {
  return (
    <EmptyState
      icon="eye"
      title="Nothing draws this session"
      action={
        <Button variant="primary" onClick={() => void ensureStoryView(host, session)}>
          Use the default view
        </Button>
      }
    >
      Every session needs a view to be seen through.
    </EmptyState>
  );
}

/** The story as its story view draws it: output parts, drawn through the renderer registry. */
function StoryView({ host, session }: PanelProps) {
  const view = storyView(session);
  const renderer = view ? view.skillIds.join() : '';
  const shown = useParts(
    session,
    () =>
      session.invoke(STORY_VIEW, renderContract, 'render', {
        messages: [...session.transcript(USER_ID)],
      }),
    renderer,
  );
  if (!view) return <NoStoryView host={host} session={session} />;
  if (!shown) return null;
  if ('error' in shown) return <p className="job__error">{shown.error}</p>;
  return shown.parts.map((part, i) => <div key={i}>{host.renderers.render(part)}</div>);
}

function useMessageActionsFor(session: SessionRuntime): MessageActions {
  const busy = session.speaking !== undefined;
  return useMemo(
    () => ({
      canRetry: (id) => retryable(session, id) !== undefined,
      retry: (id) => runSafely(() => retryMessage(session, id)),
      busy,
    }),
    [session, busy],
  );
}

/** The story, drawn by the story's renderer, plus whoever is writing right now. */
export function Feed({ host, session }: PanelProps) {
  const end = useRef<HTMLDivElement>(null);
  const messages = session.transcript(USER_ID);
  const nameOf = (id: string) => session.actors.find((a) => a.id === id)?.personality.name ?? id;
  const speaking = session.speaking;
  const actions = useMessageActionsFor(session);
  const live = speaking ? (session.calls.running(speaking).at(-1)?.text.length ?? 0) : 0;

  useEffect(() => {
    // Braces matter: newer browsers return a promise from scrollIntoView, and
    // React would call anything an effect returns as its cleanup.
    end.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages.length, speaking, live]);

  return (
    <main className="feed">
      <div className="feed__inner">
        {messages.length === 0 && !speaking && <Welcome session={session} />}
        {messages.length > 0 && (
          <MessageActionsContext.Provider value={actions}>
            <StoryView host={host} session={session} />
          </MessageActionsContext.Provider>
        )}
        {speaking && (
          <Live host={host} session={session} actorId={speaking} name={nameOf(speaking)} />
        )}
        <div ref={end} />
      </div>
    </main>
  );
}

export const feedModule: AppModule = {
  id: 'feed',
  register: (host) =>
    host.panels.register({ id: 'story', title: 'Session', slot: 'main', component: Feed }),
};
