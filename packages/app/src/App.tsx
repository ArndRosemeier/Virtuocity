import { useMemo, useReducer, useState } from 'react';
import { MessageTree } from '@virtuocity/core';
import { createHost } from './host';
import { readApiKey, writeApiKey } from './settings';
import { Feed } from './Feed';
import { Slot } from './Slot';
import { StatsBadge } from './StatsBadge';
import './app.css';

export function App() {
  const host = useMemo(createHost, []);
  const tree = useMemo(() => new MessageTree(), []);
  const [, refresh] = useReducer((n: number) => n + 1, 0);
  const [draft, setDraft] = useState('');
  const [apiKey, setApiKey] = useState(readApiKey);

  const act = () => {
    if (!draft.trim()) return;
    tree.append({ actorId: 'user', parts: [{ kind: 'text', data: draft }] });
    setDraft('');
    refresh();
  };

  return (
    <div className="layout">
      <header>
        <h1>Virtuocity</h1>
        <StatsBadge stats={tree.allStats()} />
        <input
          type="password"
          placeholder="OpenRouter key"
          value={apiKey}
          onChange={(e) => {
            setApiKey(e.target.value);
            writeApiKey(e.target.value);
          }}
        />
      </header>
      <Feed host={host} messages={tree.activePath()} />
      <Slot host={host} name="side" />
      <footer>
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Your turn…"
        />
        <button onClick={act}>Act</button>
        <button disabled title="Pass to the director (coming next)">
          Pass
        </button>
      </footer>
    </div>
  );
}
