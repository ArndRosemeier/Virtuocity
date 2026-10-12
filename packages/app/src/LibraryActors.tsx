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

interface Editing {
  readonly libraryId: string;
  readonly actor: Actor;
}

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

/**
 * Built-in actors (from the installed setups) first, then the ones you saved.
 * Built-ins are protected; copy one to make a variation you can edit.
 */
export function LibraryActors({
  host,
  session,
  builtIn,
  actors,
}: PanelProps & { builtIn: readonly BuiltInActor[]; actors: readonly SavedActor[] }) {
  const library = useLibrary();
  const [editing, setEditing] = useState<Editing | null>(null);
  const add = (actor: Actor) => run(() => session.join({ ...actor, id: crypto.randomUUID() }));
  const copy = (actor: Actor) =>
    run(async () => {
      const saved = await library.saveActor(copyOfActor(actor, crypto.randomUUID()));
      setEditing({ libraryId: saved.id, actor: saved.actor });
    });
  const buttons = (actor: Actor) => (
    <ActorButtons actor={actor} onAdd={() => add(actor)} onCopy={() => copy(actor)} />
  );
  return (
    <>
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
            <IconButton
              size="sm"
              icon="edit"
              label={`Edit ${actor.personality.name}`}
              onClick={() => setEditing({ libraryId: id, actor })}
            />
            <IconButton
              size="sm"
              icon="trash"
              label={`Delete ${actor.personality.name} from the library`}
              onClick={() => run(() => library.remove(id))}
            />
          </Row>
        ))}
      </ul>
      {builtIn.length + actors.length === 0 && (
        <p className="muted">No actors have all the selected skills.</p>
      )}
      {editing && (
        <ActorDialog
          host={host}
          session={session}
          actor={editing.actor}
          open
          onClose={() => setEditing(null)}
          onSave={(next) => run(() => library.updateActor(editing.libraryId, next))}
        />
      )}
    </>
  );
}
