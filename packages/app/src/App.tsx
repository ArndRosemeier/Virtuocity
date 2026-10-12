import { useEffect, useMemo, useState } from 'react';
import { Library, createAssetStore } from '@virtuocity/core';
import { AppActionsContext } from './actions';
import { LibraryContext } from './library';
import { Dialogs, dialogActions } from './Dialogs';
import type { OpenDialog } from './Dialogs';
import { Header } from './Header';
import { Area, Slot, contributions } from './Slot';
import { AssetsContext } from './media';
import { createHost } from './host';
import { indexedDbStore } from './storage';
import { useSession } from './useSession';
import { useTheme } from './theme';
import './app.css';

export function App() {
  const host = useMemo(createHost, []);
  const sessions = useMemo(() => indexedDbStore<unknown>('sessions'), []);
  const assets = useMemo(() => createAssetStore(indexedDbStore('assets')), []);
  const library = useMemo(() => new Library(indexedDbStore('library')), []);
  const session = useSession(host, sessions, assets);
  const [dialog, setDialog] = useState<OpenDialog | null>(null);
  useTheme();
  useEffect(() => {
    // Dev builds expose the session for debugging in the browser console.
    if (import.meta.env.DEV) Object.assign(window, { virtuocity: { host, session } });
  }, [host, session]);

  const actions = useMemo(() => dialogActions(setDialog), []);
  const left = contributions({ host, session }, 'left').length > 0;

  return (
    <AppActionsContext.Provider value={actions}>
      <AssetsContext.Provider value={assets}>
        <LibraryContext.Provider value={library}>
          <div className={left ? 'layout layout--left' : 'layout'}>
            <Header session={session} assets={assets} />
            <Slot name="left" host={host} session={session} />
            <Area name="main" host={host} session={session} />
            <Slot name="side" host={host} session={session} />
            <Area name="input" host={host} session={session} />
          </div>
          <Dialogs host={host} session={session} dialog={dialog} onClose={() => setDialog(null)} />
        </LibraryContext.Provider>
      </AssetsContext.Provider>
    </AppActionsContext.Provider>
  );
}
