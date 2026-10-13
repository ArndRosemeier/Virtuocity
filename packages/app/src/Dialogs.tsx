import type { AppActions } from './actions';
import { useAppActions } from './actions';
import { ActorDialog } from './ActorDialog';
import { NewSessionDialog } from './NewSessionDialog';
import { LibraryDialog } from './LibraryDialog';
import { runSafely } from './LibraryActors';
import { isLibraryActor, saveEverywhere, useLibrary, useLibraryItems } from './library';
import type { Actor } from '@virtuocity/core';
import { SessionsDialog } from './SessionsDialog';
import { SettingsModal } from './SettingsModal';
import type { SettingsTab } from './SettingsModal';
import type { PanelProps } from './types';

/** The one app dialog that is open; a `picking` Library adds an actor to the session. */
export type OpenDialog =
  | { readonly kind: 'settings'; readonly tab: SettingsTab }
  | { readonly kind: 'actor'; readonly actorId: string }
  | { readonly kind: 'new-session' }
  | { readonly kind: 'sessions' }
  | { readonly kind: 'library'; readonly picking?: boolean };

export function dialogActions(open: (dialog: OpenDialog) => void): AppActions {
  return {
    openSettings: (tab = 'connection') => open({ kind: 'settings', tab }),
    openAddActor: () => open({ kind: 'library', picking: true }),
    openEditActor: (actorId) => open({ kind: 'actor', actorId }),
    openNewSession: () => open({ kind: 'new-session' }),
    openSessions: () => open({ kind: 'sessions' }),
    openLibrary: () => open({ kind: 'library' }),
  };
}

/** Edits an actor of the session; the change goes to the library as well. */
function EditSessionActor({
  host,
  session,
  actorId,
  onClose,
}: PanelProps & { actorId: string; onClose: () => void }) {
  const library = useLibrary();
  const { actors } = useLibraryItems();
  const actor = session.actors.find((a) => a.id === actorId);
  if (!actor) return null;
  // The story view is the app's, not the library's: it changes in this session only.
  const inLibrary = isLibraryActor(actor);
  const others = inLibrary ? actors.filter((i) => i.id !== actorId) : [];
  const save = (next: Actor) =>
    inLibrary ? saveEverywhere({ host, library, session }, next) : session.join(next);
  return (
    <ActorDialog
      host={host}
      actor={actor}
      open
      onClose={onClose}
      takenNames={others.map((i) => i.actor.personality.name)}
      onSave={(next) => runSafely(() => save(next))}
    />
  );
}

/** Renders whichever dialog is open. Each one mounts fresh, so its form starts clean. */
export function Dialogs({
  host,
  session,
  dialog,
  onClose,
}: PanelProps & { dialog: OpenDialog | null; onClose: () => void }) {
  const props = { host, session, open: true, onClose };
  const { openNewSession } = useAppActions();
  switch (dialog?.kind) {
    case 'settings':
      return <SettingsModal host={host} open initialTab={dialog.tab} onClose={onClose} />;
    case 'actor':
      return <EditSessionActor {...props} actorId={dialog.actorId} />;
    case 'new-session':
      return <NewSessionDialog {...props} />;
    case 'sessions':
      return <SessionsDialog onNew={openNewSession} onClose={onClose} />;
    case 'library':
      return <LibraryDialog {...props} picking={dialog.picking ?? false} />;
    default:
      return null;
  }
}
