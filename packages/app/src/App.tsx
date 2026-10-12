import { useEffect, useMemo, useState } from 'react';
import { createAssetStore } from '@virtuocity/core';
import { AppActionsContext } from './actions';
import type { AppActions } from './actions';
import { CharacterDialog } from './CharacterDialog';
import { Composer } from './Composer';
import { Feed } from './Feed';
import { Header } from './Header';
import { SettingsModal } from './SettingsModal';
import type { SettingsTab } from './SettingsModal';
import { Slot } from './Slot';
import { createHost } from './host';
import { indexedDbStore } from './storage';
import { useSession } from './useSession';
import { useTheme } from './theme';
import './app.css';

export function App() {
  const host = useMemo(createHost, []);
  const sessions = useMemo(() => indexedDbStore<unknown>('sessions'), []);
  const assets = useMemo(() => createAssetStore(indexedDbStore('assets')), []);
  const session = useSession(host, sessions);
  const [settingsTab, setSettingsTab] = useState<SettingsTab | null>(null);
  const [newCharacter, setNewCharacter] = useState(false);
  useTheme();
  useEffect(() => {
    // Dev builds expose the session for debugging in the browser console.
    if (import.meta.env.DEV) Object.assign(window, { virtuocity: { host, session } });
  }, [host, session]);

  const actions = useMemo<AppActions>(
    () => ({
      openSettings: (tab = 'connection') => setSettingsTab(tab),
      openNewCharacter: () => setNewCharacter(true),
    }),
    [],
  );

  return (
    <AppActionsContext.Provider value={actions}>
      <div className="layout">
        <Header session={session} assets={assets} />
        <Feed host={host} session={session} />
        <Slot name="side" host={host} session={session} />
        <Composer session={session} />
      </div>
      <SettingsModal
        key={settingsTab ?? 'closed'}
        host={host}
        open={settingsTab !== null}
        initialTab={settingsTab ?? 'connection'}
        onClose={() => setSettingsTab(null)}
      />
      <CharacterDialog
        host={host}
        session={session}
        open={newCharacter}
        onClose={() => setNewCharacter(false)}
      />
    </AppActionsContext.Provider>
  );
}
