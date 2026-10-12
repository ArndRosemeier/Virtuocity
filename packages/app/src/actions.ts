import { createContext, useContext } from 'react';
import type { SettingsTab } from './SettingsModal';

/** App-level dialogs any component or panel can open. */
export interface AppActions {
  openSettings(tab?: SettingsTab): void;
  /** Opens the Library to pick an actor for the session, or make a new one. */
  openAddActor(): void;
  openEditActor(actorId: string): void;
  /** Names a new session and picks a setup for it. */
  openNewSession(): void;
  /** The list of sessions and templates. */
  openSessions(): void;
  openLibrary(): void;
}

export const AppActionsContext = createContext<AppActions | null>(null);

export function useAppActions(): AppActions {
  const actions = useContext(AppActionsContext);
  if (!actions) throw new Error('useAppActions must be used inside the app');
  return actions;
}
