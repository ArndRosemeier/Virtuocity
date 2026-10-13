import { useEffect, useMemo } from 'react';
import type { SessionRuntime } from '@virtuocity/core';
import {
  messageVersions,
  retryMessage,
  retryable,
  showVersion,
  textContent,
} from '@virtuocity/core';
import type { StoryMarker } from '@virtuocity/contract-render';
import { markerContract, renderContract } from '@virtuocity/contract-render';
import { Avatar, Button, EmptyState } from '@virtuocity/ui';
import { useAppActions } from './actions';
import { useActorTips } from './actorTips';
import { MessageView } from './ChatView';
import { runSafely } from './LibraryActors';
import type { MessageActions } from './messageActions';
import { MessageActionsContext } from './messageActions';
import { USER_ID } from './useSession';
import { STORY_VIEW, ensureStoryView, storyView } from './storyView';
import type { AppModule, PanelProps } from './types';
import { useReadyProviders } from './useModels';
import { useParts } from './useParts';
import { useStickToBottom } from './stickToBottom';

function Welcome({ host, session }: Pick<PanelProps, 'host' | 'session'>) {
  const { openSettings, openAddActor, openNewSession } = useAppActions();
  if (useReadyProviders(host).length === 0) {
    return (
      <EmptyState
        icon="key"
        title="Light the lantern"
        action={
          <Button variant="primary" icon="settings" onClick={() => openSettings('connection')}>
            Connect a provider
          </Button>
        }
      >
        Add a key for OpenRouter, OpenAI or Anthropic to bring actors to life. Keys stay in this
        browser.
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

/** Stops a stuck or unwanted answer; nothing of it is kept. */
function StopButton({ session }: Pick<PanelProps, 'session'>) {
  return (
    <Button size="sm" variant="ghost" icon="close" onClick={() => void session.stop()}>
      Stop
    </Button>
  );
}

/** What the speaking actor is writing right now, as it streams in, with a way to stop it. */
function Live({ host, session, actorId, name }: PanelProps & { actorId: string; name: string }) {
  const tip = useActorTips()(actorId);
  const call = session.calls.running(actorId).at(-1);
  const text = call?.text.trim() ?? '';
  if (!call || !text) {
    return (
      <div className="typing">
        <Avatar name={name} title={tip} />
        <span title={tip}>{name} is writing</span>
        <span className="typing__dots" aria-hidden>
          <i />
          <i />
          <i />
        </span>
        <StopButton session={session} />
      </div>
    );
  }
  return (
    <>
      <MessageView host={host} name={name} tip={tip} part={{ kind: 'text', data: text }} live />
      <div className="typing__stop">
        <StopButton session={session} />
      </div>
    </>
  );
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

/** Every marker the session's actors place in the story, e.g. a chronicler's "Summarized". */
async function storyMarkers(session: SessionRuntime): Promise<StoryMarker[]> {
  const placing = session.actors.filter((a) => session.implementationFor(a.id, markerContract));
  const placed = await Promise.all(
    placing.map(async (actor) => {
      const { markers } = await session.invoke(actor.id, markerContract, 'markers', {});
      return markers.map((m) => ({ ...m, actorId: actor.id }));
    }),
  );
  return placed.flat();
}

/** The story as its story view draws it: output parts, drawn through the renderer registry. */
function StoryView({ host, session }: PanelProps) {
  const view = storyView(session);
  const renderer = view ? view.skillIds.join() : '';
  const shown = useParts(
    session,
    async () =>
      session.invoke(STORY_VIEW, renderContract, 'render', {
        messages: [...session.transcript(USER_ID)],
        markers: await storyMarkers(session),
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
      versions: (id) => {
        const found = messageVersions(session.workspace.log, id);
        return found && { index: found.index, count: found.count };
      },
      showVersion: (id, index) => runSafely(() => showVersion(session, id, index)),
      editableText: (id) => {
        const message = session.transcript(USER_ID).find((m) => m.id === id);
        return message?.kind === 'text' ? message.text : undefined;
      },
      edit: (id, text) => runSafely(() => session.editMessage(USER_ID, id, textContent(text))),
      remove: (id) => runSafely(() => session.removeMessage(USER_ID, id)),
      busy,
    }),
    [session, busy],
  );
}

/** The story, drawn by the story's renderer, plus whoever is writing right now. */
export function Feed({ host, session }: PanelProps) {
  const { scroller, content, pin } = useStickToBottom<HTMLElement, HTMLDivElement>();
  const messages = session.transcript(USER_ID);
  const nameOf = (id: string) => session.actors.find((a) => a.id === id)?.personality.name ?? id;
  const speaking = session.speaking;
  const actions = useMessageActionsFor(session);

  // A new message or a new speaker brings the end into view; growth after that stays pinned.
  useEffect(pin, [pin, messages.length, speaking]);

  return (
    <main className="feed" ref={scroller}>
      <div className="feed__inner" ref={content}>
        {messages.length === 0 && !speaking && <Welcome host={host} session={session} />}
        {messages.length > 0 && (
          <MessageActionsContext.Provider value={actions}>
            <StoryView host={host} session={session} />
          </MessageActionsContext.Provider>
        )}
        {speaking && (
          <Live host={host} session={session} actorId={speaking} name={nameOf(speaking)} />
        )}
      </div>
    </main>
  );
}

export const feedModule: AppModule = {
  id: 'feed',
  register: (host) =>
    host.panels.register({ id: 'story', title: 'Session', slot: 'main', component: Feed }),
};
