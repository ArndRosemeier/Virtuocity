import { useState } from 'react';
import type { Actor, SavedActor } from '@virtuocity/core';
import { Avatar, Button, IconButton, Pill } from '@virtuocity/ui';
import { ActorDialog } from './ActorDialog';
import { useActorTips } from './actorTips';
import { CopyActorDialog } from './LibraryActorDialogs';
import { saveEverywhere, useLibrary } from './library';
import { SessionGoesDialog } from './SessionGoesDialog';
import type { PanelProps } from './types';
import { clearSession } from './useSession';

export const runSafely = (action: () => Promise<unknown>) =>
  void action().catch((error: unknown) => alert(`Something went wrong: ${String(error)}`));

export function Row({
  name,
  detail,
  title,
  children,
}: {
  name: string;
  detail: string;
  /** Hover text for the whole row. */
  title?: string | undefined;
  children: React.ReactNode;
}) {
  return (
    <li className="cast__item" title={title}>
      <Avatar name={name} />
      <div className="cast__info">
        <strong>{name}</strong>
        <span className="muted library__detail">{detail}</span>
      </div>
      {children}
    </li>
  );
}

/** A library actor's row; hovering it says what the actor is. */
function ActorRow({ actor, children }: { actor: Actor; children: React.ReactNode }) {
  const tip = useActorTips()(actor);
  return (
    <Row name={actor.personality.name} detail={actor.personality.description} title={tip}>
      {children}
    </Row>
  );
}

/** The dialog open over the actor list. */
type Open =
  { readonly kind: 'new' } | { readonly kind: 'edit' | 'copy' | 'delete'; readonly actor: Actor };

function ActorButtons({
  actor,
  inSession,
  onAdd,
  onOpen,
}: {
  actor: Actor;
  inSession: boolean;
  onAdd: () => void;
  onOpen: (open: Open) => void;
}) {
  const name = actor.personality.name;
  return (
    <>
      {inSession ? (
        <Pill tone="accent">in the session</Pill>
      ) : (
        <Button size="sm" icon="plus" onClick={onAdd}>
          Add
        </Button>
      )}
      <IconButton
        size="sm"
        icon="copy"
        label={`Copy ${name}`}
        onClick={() => onOpen({ kind: 'copy', actor })}
      />
      <IconButton
        size="sm"
        icon="edit"
        label={`Edit ${name}`}
        onClick={() => onOpen({ kind: 'edit', actor })}
      />
      <IconButton
        size="sm"
        icon="trash"
        label={`Delete ${name}`}
        onClick={() => onOpen({ kind: 'delete', actor })}
      />
    </>
  );
}

/** The dialogs of the actor list: new, edit, copy, and delete for an actor in the session. */
function ActorListDialog({
  host,
  session,
  open,
  names,
  onAdded,
  onClose,
}: PanelProps & {
  open: Open;
  names: readonly string[];
  onAdded: (() => void) | undefined;
  onClose: () => void;
}) {
  const library = useLibrary();
  const others = (actor?: Actor) => names.filter((n) => !actor || n !== actor.personality.name);
  const join = async (actor: Actor) => {
    await session.join(actor);
    onAdded?.();
  };
  const create = async (actor: Actor) => {
    await library.saveActor(actor);
    if (onAdded) await join(actor);
  };
  if (open.kind === 'new') {
    const label = onAdded ? 'Create and add' : 'Create';
    const save = (a: Actor) => runSafely(() => create(a));
    return (
      <ActorDialog
        host={host}
        open
        onClose={onClose}
        takenNames={names}
        onSave={save}
        saveLabel={label}
      />
    );
  }
  const { actor } = open;
  if (open.kind === 'edit') {
    const save = (a: Actor) => runSafely(() => saveEverywhere(library, session, a));
    return (
      <ActorDialog
        host={host}
        actor={actor}
        open
        onClose={onClose}
        takenNames={others(actor)}
        onSave={save}
      />
    );
  }
  if (open.kind === 'copy') {
    const copy = (a: Actor) => runSafely(() => library.saveActor(a));
    return <CopyActorDialog actor={actor} takenNames={names} onCopy={copy} onClose={onClose} />;
  }
  return <DeleteInSession host={host} session={session} actor={actor} onClose={onClose} />;
}

/** Deleting an actor the session uses: the session goes too, after a warning. */
function DeleteInSession({
  host,
  session,
  actor,
  onClose,
}: PanelProps & { actor: Actor; onClose: () => void }) {
  const library = useLibrary();
  const deleteBoth = async () => {
    await clearSession(host, session);
    await library.remove(actor.id);
  };
  const name = actor.personality.name;
  return (
    <SessionGoesDialog
      title={`Delete ${name}`}
      confirm={`Delete ${name} and the session`}
      onConfirm={() => runSafely(deleteBoth)}
      onClose={onClose}
    >
      {name} is in the current session, so deleting {name} also deletes that session.
    </SessionGoesDialog>
  );
}

const emptyNote = (none: boolean) =>
  none ? 'No actors yet. Create one.' : 'No actors have all the selected skills.';

/**
 * The library's actors. Adding one puts that very actor in the session, so
 * editing it anywhere changes it everywhere; copy it to make a variation.
 * When `onAdded` is given (picking for the session), new actors join the
 * session too, and `onAdded` runs after any actor joins.
 */
export function LibraryActors({
  host,
  session,
  actors,
  names,
  onAdded,
}: PanelProps & {
  actors: readonly SavedActor[];
  /** Every actor name in the library, filtered or not. */
  names: readonly string[];
  onAdded?: (() => void) | undefined;
}) {
  const library = useLibrary();
  const [open, setOpen] = useState<Open | null>(null);
  const inSession = (id: string) => session.actors.some((a) => a.id === id);
  const add = (actor: Actor) =>
    runSafely(async () => {
      await session.join(actor);
      onAdded?.();
    });
  const remove = (actor: Actor) =>
    inSession(actor.id)
      ? setOpen({ kind: 'delete', actor })
      : runSafely(() => library.remove(actor.id));
  const onOpen = (next: Open) => (next.kind === 'delete' ? remove(next.actor) : setOpen(next));
  return (
    <>
      <Button icon="plus" className="library__new" onClick={() => setOpen({ kind: 'new' })}>
        New actor
      </Button>
      <ul className="cast__list">
        {actors.map(({ id, actor }) => (
          <ActorRow key={id} actor={actor}>
            <ActorButtons
              actor={actor}
              inSession={inSession(id)}
              onAdd={() => add(actor)}
              onOpen={onOpen}
            />
          </ActorRow>
        ))}
      </ul>
      {actors.length === 0 && <p className="muted">{emptyNote(names.length === 0)}</p>}
      {open && (
        <ActorListDialog
          host={host}
          session={session}
          open={open}
          names={names}
          onAdded={onAdded}
          onClose={() => setOpen(null)}
        />
      )}
    </>
  );
}
