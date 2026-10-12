import { useMemo } from 'react';
import { Composer } from './Composer';
import { Feed } from './Feed';
import { SettingsBar } from './SettingsBar';
import { Slot } from './Slot';
import { StatsBadge } from './StatsBadge';
import { createHost } from './host';
import { useSession } from './useSession';
import './app.css';

export function App() {
  const host = useMemo(createHost, []);
  const session = useSession(host);

  return (
    <div className="layout">
      <header>
        <h1>Virtuocity</h1>
        <StatsBadge stats={session.messages.allStats()} />
        <SettingsBar />
      </header>
      <Feed host={host} session={session} />
      <Slot host={host} name="side" session={session} />
      <Composer session={session} />
    </div>
  );
}
