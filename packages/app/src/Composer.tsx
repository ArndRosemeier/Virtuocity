import { useState } from 'react';
import type { KeyboardEvent } from 'react';
import type { SessionRuntime } from '@virtuocity/core';
import { Avatar, Button, Icon } from '@virtuocity/ui';
import { USER_ID } from './useSession';

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

/** Pass, or pick exactly who speaks next. */
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
  return (
    <div className="composer__turns">
      <Button
        size="sm"
        variant="ghost"
        icon="skip"
        disabled={busy || speakers.length === 0}
        onClick={() => void run(() => session.pass())}
      >
        Pass
      </Button>
      {speakers.length > 0 && <span className="composer__label">or let speak:</span>}
      {speakers.map((a) => (
        <button
          key={a.id}
          type="button"
          className="speaker-chip"
          disabled={busy}
          onClick={() => void run(() => session.runTurn(a.id))}
        >
          <Avatar name={a.personality.name} />
          {a.personality.name}
        </button>
      ))}
      <span className="composer__hint">
        <Icon name="lantern" /> The story pauses after every turn.
      </span>
    </div>
  );
}

/**
 * The pause between turns. The human can act (and a director-picked character
 * answers once), pass (a character takes one turn), or pick who speaks next.
 */
export function Composer({ session }: { session: SessionRuntime }) {
  const [draft, setDraft] = useState('');
  const { busy, error, run } = useTurnRunner();
  const act = () =>
    run(async () => {
      const text = draft.trim();
      if (!text) return;
      setDraft('');
      await session.post(USER_ID, [{ kind: 'text', data: text }]);
      await session.pass();
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
