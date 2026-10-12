import { useState } from 'react';
import type { Actor, BuiltInActor, SavedActor } from '@virtuocity/core';
import { copyOfActor } from '@virtuocity/core';
import { Avatar, Button, IconButton, Pill } from '@virtuocity/ui';
import { ActorDialog } from './ActorDialog';
import { useLibrary } from './library';
import type { PanelProps } from './types';

export const run = (action: () => Promise<unknown>) =>
  void action().catch((error: unknown) => alert(`Something went wrong: ${String(error)}`));

export function Row({
  name,
  detail,
  children,
}: {
  name: string;
  detail: string;
  children: React.ReactNode;
}) {
  return (
    <li className="cast__item">
      <Avatar name={name} />
      <div className="cast__info">
        <strong>{name}</strong>
        <span className="muted library__detail">{detail}</span>
      </div>
      {children}
    </li>
  );
}

export const BUILT_IN = <Pill>built-in</Pill>;

/** A saved actor being edited, or `new` for an actor being made. */
type Editing = { readonly libraryId: string; readonly actor: Actor } | 'new';

function ActorButtons({
  actor,
  onAdd,
  onCopy,
}: {
  actor: Actor;
  onAdd: () => void;
  onCopy: () => void;
}) {
  return (
    <>
      <Button size="sm" icon="plus" onClick={onAdd}>
        Add
      </Button>
      <IconButton size="sm" icon="copy" label={`Copy ${actor.personality.name}`} onClick={onCopy} />
    </>
  );
}

/** Edit and delete, for actors you saved. */
function SavedButtons({
  name,
  onEdit,
  onDelete,
}: {
  name: string;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <>
      <IconButton size="sm" icon="edit" label={`Edit ${name}`} onClick={onEdit} />
      <IconButton
        size="sm"
        icon="trash"
        label={`Delete ${name} from the library`}
        onClick={onDelete}
      />
    </>
  );
}

/** The actor dialog for a new actor, or for a saved one, which it updates in the library. */
function EditActor({
  host,
  session,
  editing,
  onClose,
  onCreate,
  createLabel,
}: PanelProps & {
  editing: Editing;
  onClose: () => void;
  onCreate: (actor: Actor) => void;
  createLabel: string;
}) {
  const library = useLibrary();
  const dialog = { host, session, open: true, onClose };
  if (editing === 'new')
    return <ActorDialog {...dialog} onSave={onCreate} saveLabel={createLabel} />;
  return (
    <ActorDialog
      {...dialog}
      actor={editing.actor}
      onSave={(next) => run(() => library.updateActor(editing.libraryId, next))}
    />
  );
}

/** What the actor list does: add to the session, make a new actor, copy one to edit. */
function useActorActions(
  session: PanelProps['session'],
  setEditing: (editing: Editing) => void,
  onAdded: (() => void) | undefined,
) {
  const library = useLibrary();
  const join = (actor: Actor) =>
    run(async () => {
      await session.join(actor);
      onAdded?.();
    });
  const add = (actor: Actor) => join({ ...actor, id: crypto.randomUUID() });
  const create = (actor: Actor) =>
    run(async () => {
      await library.saveActor(actor);
      if (onAdded) join(actor);
    });
  const copy = (actor: Actor) =>
    run(async () => {
      const saved = await library.saveActor(copyOfActor(actor, crypto.randomUUID()));
      setEditing({ libraryId: saved.id, actor: saved.actor });
    });
  return { add, create, copy };
}

/**
 * Built-in actors (from the installed setups) first, then the ones you saved.
 * Built-ins are protected; copy one to make a variation you can edit.
 * New actors are saved to the library. When `onAdded` is given (picking for the
 * session), they also join the session, and `onAdded` runs after any actor joins.
 */
export function LibraryActors({
  host,
  session,
  builtIn,
  actors,
  onAdded,
}: PanelProps & {
  builtIn: readonly BuiltInActor[];
  actors: readonly SavedActor[];
  onAdded?: (() => void) | undefined;
}) {
  const library = useLibrary();
  const [editing, setEditing] = useState<Editing | null>(null);
  const { add, create, copy } = useActorActions(session, setEditing, onAdded);
  const buttons = (actor: Actor) => (
    <ActorButtons actor={actor} onAdd={() => add(actor)} onCopy={() => copy(actor)} />
  );
  return (
    <>
      <Button icon="plus" className="library__new" onClick={() => setEditing('new')}>
        New actor
      </Button>
      <ul className="cast__list">
        {builtIn.map(({ id, blueprint, actor }) => (
          <Row key={id} name={actor.personality.name} detail={`From ${blueprint.name}`}>
            {BUILT_IN}
            {buttons(actor)}
          </Row>
        ))}
        {actors.map(({ id, actor }) => (
          <Row key={id} name={actor.personality.name} detail={actor.personality.description}>
            {buttons(actor)}
            <SavedButtons
              name={actor.personality.name}
              onEdit={() => setEditing({ libraryId: id, actor })}
              onDelete={() => run(() => library.remove(id))}
            />
          </Row>
        ))}
      </ul>
      {builtIn.length + actors.length === 0 && (
        <p className="muted">No actors have all the selected skills.</p>
      )}
      {editing && (
        <EditActor
          host={host}
          session={session}
          editing={editing}
          onClose={() => setEditing(null)}
          onCreate={create}
          createLabel={onAdded ? 'Add to scene' : 'Save to library'}
        />
      )}
    </>
  );
}
