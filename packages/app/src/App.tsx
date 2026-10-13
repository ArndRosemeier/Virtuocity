import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { Library, createAssetStore, qualifyOverrides, upgradeActor } from '@virtuocity/core';
import type { Actor, AssetStore } from '@virtuocity/core';
import type { PanelProps } from './types';
import { AppActionsContext } from './actions';
import { ConflictsContext, useConflictDialog } from './conflicts';
import { AskModelContext, askModel } from './transform';
import { LibraryContext } from './library';
import { Dialogs, dialogActions } from './Dialogs';
import type { OpenDialog } from './Dialogs';
import { Header } from './Header';
import { useSidebarStyle } from './ResizeHandle';
import { Area, Slot } from './Slot';
import { slotItems } from './sessionType';
import { TypeStateContext, useTypeState } from './useSessionType';
import { AssetsContext } from './media';
import { ActorTipsContext, actorTips } from './actorTips';
import { createHost } from './host';
import { ChoicesContext } from '@virtuocity/ui';
import { appChoices } from './choices';
import { indexedDbStore } from './storage';
import { useSession } from './useSession';
import { SwitcherContext } from './switcher';
import { useTheme } from './theme';
import './app.css';

/** Actors saved before there were several providers chose OpenRouter models without saying so. */
function withQualifiedModels(actor: Actor): Actor {
  return actor.models ? { ...actor, models: qualifyOverrides(actor.models, 'openrouter') } : actor;
}

/**
 * The session on screen, laid out as its session type says, with dialogs
 * (`children`) that can pick from the app's lists.
 */
function Screen({
  host,
  session,
  assets,
  children,
}: PanelProps & { assets: AssetStore; children: ReactNode }) {
  const typeState = useTypeState({ host, session });
  const choices = useMemo(() => appChoices(host), [host]);
  const left = slotItems(host.panels.list(), 'left', typeState).length > 0;
  const sidebars = useSidebarStyle();
  return (
    <TypeStateContext.Provider value={typeState}>
      <ChoicesContext.Provider value={choices}>
        <div className={left ? 'layout layout--left' : 'layout'} style={sidebars}>
          <Header session={session} assets={assets} />
          <Slot name="left" host={host} session={session} />
          <Area name="main" host={host} session={session} />
          <Slot name="side" host={host} session={session} />
          <Area name="input" host={host} session={session} />
        </div>
        {children}
      </ChoicesContext.Provider>
    </TypeStateContext.Provider>
  );
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
    // Dev builds expose the session, library and switcher for debugging in the browser console.
    if (import.meta.env.DEV)
      Object.assign(window, { virtuocity: { host, session, library, switcher } });
  }, [host, session, library, switcher]);

  const actions = useMemo(() => dialogActions(setDialog), []);

  return (
    <AppActionsContext.Provider value={actions}>
      <SwitcherContext.Provider value={switcher}>
        <AssetsContext.Provider value={assets}>
          <LibraryContext.Provider value={library}>
            <ConflictsContext.Provider value={resolve}>
              <AskModelContext.Provider value={ask}>
                <ActorTipsContext.Provider value={tips}>
                  <Screen host={host} session={session} assets={assets}>
                    <Dialogs
                      host={host}
                      session={session}
                      dialog={dialog}
                      onClose={() => setDialog(null)}
                    />
                    {conflictDialog}
                  </Screen>
                </ActorTipsContext.Provider>
              </AskModelContext.Provider>
            </ConflictsContext.Provider>
          </LibraryContext.Provider>
        </AssetsContext.Provider>
      </SwitcherContext.Provider>
    </AppActionsContext.Provider>
  );
}
