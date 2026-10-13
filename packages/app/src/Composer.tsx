import { useEffect, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import { directorContract } from '@virtuocity/contract-director';
import type { Actor, SessionRuntime } from '@virtuocity/core';
import { textContent } from '@virtuocity/core';
import type { TurnTakingInput } from '@virtuocity/turn-taking';
import { Avatar, Button, Icon } from '@virtuocity/ui';
import { useActorTips } from './actorTips';
import type { AppModule } from './types';
import { USER_ID } from './useSession';

/** Runs one round of the turn-taking flow, surfacing a failed run as an error. */
async function takeTurn(session: SessionRuntime, input: TurnTakingInput): Promise<void> {
  const result = await session.flows.run('turn-taking', input);
  if (result.outcome === 'failed') {
    throw result.error instanceof Error ? result.error : new Error(String(result.error));
  }
}

function useTurnRunner() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const run = async (work: () => Promise<unknown>) => {
    setBusy(true);
    setError('');
    try {
      await work();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };
  return { busy, error, run };
}

/** Whether someone in the session directs it, picking who speaks when a person acts or passes. */
function hasDirector(session: SessionRuntime): boolean {
  return session.actors.some((a) => session.implementationFor(a.id, directorContract));
}

/** Whether the person is typing somewhere else, e.g. editing a message or in a dialog. */
function typingElsewhere(): boolean {
  const active = document.activeElement;
  if (!(active instanceof HTMLElement)) return false;
  return active.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(active.tagName);
}

/** Puts the focus back on the input line whenever the AI is done, unless the person types elsewhere. */
function useFocusWhenDone(working: boolean) {
  const input = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    if (!working && !typingElsewhere()) input.current?.focus();
  }, [working]);
  return input;
}

/** An actor to pick for the next turn, or to ask to act. */
function ActorChip({
  actor,
  disabled,
  onPick,
}: {
  actor: Actor;
  disabled: boolean;
  onPick: () => void;
}) {
  const tip = useActorTips()(actor);
  return (
    <button type="button" className="speaker-chip" disabled={disabled} title={tip} onClick={onPick}>
      <Avatar name={actor.personality.name} />
      {actor.personality.name}
    </button>
  );
}

/**
 * Pick exactly who speaks next, or ask a support actor (e.g. an illustrator) to
 * act. With a director in the session, passing lets it pick.
 */
function TurnBar({
  session,
  busy,
  run,
}: {
  session: SessionRuntime;
  busy: boolean;
  run: (work: () => Promise<unknown>) => Promise<void>;
}) {
  const speakers = session.speakers();
  const askable = session.askable();
  const directed = hasDirector(session);
  const pick = (actorId: string) => run(() => takeTurn(session, { kind: 'choose', actorId }));
  return (
    <div className="composer__turns">
      {directed && (
        <Button
          size="sm"
          variant="ghost"
          icon="skip"
          disabled={busy || speakers.length === 0}
          onClick={() => void run(() => takeTurn(session, { kind: 'pass' }))}
        >
          Pass
        </Button>
      )}
      {busy && session.flows.running && (
        <Button size="sm" variant="ghost" icon="close" onClick={() => void session.stop()}>
          Stop
        </Button>
      )}
      {speakers.length > 0 && (
        <span className="composer__label">{directed ? 'or let speak:' : 'Let speak:'}</span>
      )}
      {speakers.map((a) => (
        <ActorChip key={a.id} actor={a} disabled={busy} onPick={() => void pick(a.id)} />
      ))}
      {askable.length > 0 && <span className="composer__label">or ask:</span>}
      {askable.map((a) => (
        <ActorChip key={a.id} actor={a} disabled={busy} onPick={() => void pick(a.id)} />
      ))}
      <span className="composer__hint">
        <Icon name="lantern" />{' '}
        {directed
          ? 'The session pauses after every turn.'
          : 'No director here: you pick who speaks.'}
      </span>
    </div>
  );
}

/**
 * The pause between turns. The person can act (and, if the session has a
 * director, the actor it picks answers once), pass, or pick who speaks next.
 */
export function Composer({ session }: { session: SessionRuntime }) {
  const [draft, setDraft] = useState('');
  const { busy, error, run } = useTurnRunner();
  const input = useFocusWhenDone(busy || session.speaking !== undefined);
  const act = () =>
    run(async () => {
      const text = draft.trim();
      if (!text) return;
      setDraft('');
      await session.post(USER_ID, textContent(text));
      await takeTurn(session, { kind: 'pass' });
    });

  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      if (!busy) void act();
    }
  };

  return (
    <footer className="composer">
      <div className="composer__inner">
        {error && <p className="composer__error">{error}</p>}
        <div className="composer__box">
          <textarea
            ref={input}
            className="composer__input"
            rows={2}
            value={draft}
            disabled={busy}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={onKey}
            placeholder="What do you do? (Enter to send, Shift+Enter for a new line)"
          />
          <Button
            variant="primary"
            icon="send"
            disabled={busy || !draft.trim()}
            onClick={() => void act()}
          >
            Act
          </Button>
        </div>
        <TurnBar session={session} busy={busy} run={run} />
      </div>
    </footer>
  );
}

export const composerModule: AppModule = {
  id: 'composer',
  register: (host) =>
    host.panels.register({ id: 'composer', title: 'Write', slot: 'input', component: Composer }),
};
