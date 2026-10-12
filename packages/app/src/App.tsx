import { useEffect, useMemo, useState } from 'react';
import { Library, createAssetStore, qualifyOverrides, upgradeActor } from '@virtuocity/core';
import type { Actor } from '@virtuocity/core';
import { AppActionsContext } from './actions';
import { ConflictsContext, useConflictDialog } from './conflicts';
import { AskModelContext, askModel } from './transform';
import { LibraryContext } from './library';
import { Dialogs, dialogActions } from './Dialogs';
import type { OpenDialog } from './Dialogs';
import { Header } from './Header';
import { useSidebarStyle } from './ResizeHandle';
import { Area, Slot, contributions } from './Slot';
import { AssetsContext } from './media';
import { ActorTipsContext, actorTips } from './actorTips';
import { createHost } from './host';
import { indexedDbStore } from './storage';
import { useSession } from './useSession';
import { SwitcherContext } from './switcher';
import { useTheme } from './theme';
import './app.css';

/** Actors saved before there were several providers chose OpenRouter models without saying so. */
function withQualifiedModels(actor: Actor): Actor {
  return actor.models ? { ...actor, models: qualifyOverrides(actor.models, 'openrouter') } : actor;
}

export function App() {
  const host = useMemo(createHost, []);
  const sessions = useMemo(() => indexedDbStore<unknown>('sessions'), []);
  const assets = useMemo(() => createAssetStore(indexedDbStore('assets')), []);
  const library = useMemo(
    () =>
      new Library(indexedDbStore('library'), {
        upgrade: (actor) => withQualifiedModels(upgradeActor(actor, host.skills.list())),
      }),
    [host],
  );
  const [resolve, conflictDialog] = useConflictDialog();
  const actors = useMemo(() => ({ library, resolve }), [library, resolve]);
  const { session, switcher } = useSession(host, sessions, assets, actors);
  const ask = useMemo(() => askModel(session), [session]);
  const tips = useMemo(() => actorTips({ host, session }), [host, session]);
  const [dialog, setDialog] = useState<OpenDialog | null>(null);
  useTheme();
  useEffect(() => {
    // Dev builds expose the session for debugging in the browser console.
    if (import.meta.env.DEV) Object.assign(window, { virtuocity: { host, session } });
  }, [host, session]);

  const actions = useMemo(() => dialogActions(setDialog), []);
  const left = contributions({ host, session }, 'left').length > 0;
  const sidebars = useSidebarStyle();

  return (
    <AppActionsContext.Provider value={actions}>
      <SwitcherContext.Provider value={switcher}>
        <AssetsContext.Provider value={assets}>
          <LibraryContext.Provider value={library}>
            <ConflictsContext.Provider value={resolve}>
              <AskModelContext.Provider value={ask}>
                <ActorTipsContext.Provider value={tips}>
                  <div className={left ? 'layout layout--left' : 'layout'} style={sidebars}>
                    <Header session={session} assets={assets} />
                    <Slot name="left" host={host} session={session} />
                    <Area name="main" host={host} session={session} />
                    <Slot name="side" host={host} session={session} />
                    <Area name="input" host={host} session={session} />
                  </div>
                  <Dialogs
                    host={host}
                    session={session}
                    dialog={dialog}
                    onClose={() => setDialog(null)}
                  />
                  {conflictDialog}
                </ActorTipsContext.Provider>
              </AskModelContext.Provider>
            </ConflictsContext.Provider>
          </LibraryContext.Provider>
        </AssetsContext.Provider>
      </SwitcherContext.Provider>
    </AppActionsContext.Provider>
  );
}
