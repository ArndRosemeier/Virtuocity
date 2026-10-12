import { createContext, useContext } from 'react';
import type { SettingsTab } from './SettingsModal';

/** App-level dialogs any component or panel can open. */
export interface AppActions {
  openSettings(tab?: SettingsTab): void;
  openNewCharacter(): void;
}

export const AppActionsContext = createContext<AppActions | null>(null);

export function useAppActions(): AppActions {
  const actions = useContext(AppActionsContext);
  if (!actions) throw new Error('useAppActions must be used inside the app');
  return actions;
}
