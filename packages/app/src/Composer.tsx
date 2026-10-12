import { useState } from 'react';
import type { SessionRuntime } from '@virtuocity/core';
import { USER_ID } from './useSession';

/**
 * The pause between turns. The human can act (and a director-picked character
 * answers once), pass (a character takes one turn), or pick who speaks next.
 */
export function Composer({ session }: { session: SessionRuntime }) {
  const [draft, setDraft] = useState('');
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

  const act = () =>
    run(async () => {
      const text = draft.trim();
      if (text) await session.post(USER_ID, [{ kind: 'text', data: text }]);
      setDraft('');
      await session.pass();
    });

  return (
    <footer>
      {error && <p className="error">{error}</p>}
      <textarea
        value={draft}
        disabled={busy}
        onChange={(e) => setDraft(e.target.value)}
        placeholder="Your turn…"
      />
      <div className="actions">
        <button disabled={busy || !draft.trim()} onClick={() => void act()}>
          Act
        </button>
        <button disabled={busy} onClick={() => void run(() => session.pass())}>
          Pass
        </button>
        {session.speakers().map((a) => (
          <button key={a.id} disabled={busy} onClick={() => void run(() => session.runTurn(a.id))}>
            {a.personality.name}
          </button>
        ))}
      </div>
    </footer>
  );
}
