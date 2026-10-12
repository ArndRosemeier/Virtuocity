import type { AppActions } from './actions';
import { ActorDialog } from './ActorDialog';
import { BlueprintDialog } from './BlueprintDialog';
import { LibraryDialog } from './LibraryDialog';
import { SettingsModal } from './SettingsModal';
import type { SettingsTab } from './SettingsModal';
import type { PanelProps } from './types';

/** The one app dialog that is open; `actorId: ''` creates a new actor. */
export type OpenDialog =
  | { readonly kind: 'settings'; readonly tab: SettingsTab }
  | { readonly kind: 'actor'; readonly actorId: string }
  | { readonly kind: 'new-session' }
  | { readonly kind: 'library' };

export function dialogActions(open: (dialog: OpenDialog) => void): AppActions {
  return {
    openSettings: (tab = 'connection') => open({ kind: 'settings', tab }),
    openNewActor: () => open({ kind: 'actor', actorId: '' }),
    openEditActor: (actorId) => open({ kind: 'actor', actorId }),
    openNewSession: () => open({ kind: 'new-session' }),
    openLibrary: () => open({ kind: 'library' }),
  };
}

/** Renders whichever dialog is open. Each one mounts fresh, so its form starts clean. */
export function Dialogs({
  host,
  session,
  dialog,
  onClose,
}: PanelProps & { dialog: OpenDialog | null; onClose: () => void }) {
  const props = { host, session, open: true, onClose };
  switch (dialog?.kind) {
    case 'settings':
      return <SettingsModal host={host} open initialTab={dialog.tab} onClose={onClose} />;
    case 'actor':
      return <ActorDialog {...props} actor={session.actors.find((a) => a.id === dialog.actorId)} />;
    case 'new-session':
      return <BlueprintDialog {...props} />;
    case 'library':
      return <LibraryDialog {...props} />;
    default:
      return null;
  }
}
