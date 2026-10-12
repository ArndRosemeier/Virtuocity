import { createContext, useContext } from 'react';
import type { SettingsTab } from './SettingsModal';

/** App-level dialogs any component or panel can open. */
export interface AppActions {
  openSettings(tab?: SettingsTab): void;
  openNewActor(): void;
  openEditActor(actorId: string): void;
  /** Picks a blueprint and starts over. */
  openNewSession(): void;
}

export const AppActionsContext = createContext<AppActions | null>(null);

export function useAppActions(): AppActions {
  const actions = useContext(AppActionsContext);
  if (!actions) throw new Error('useAppActions must be used inside the app');
  return actions;
}
