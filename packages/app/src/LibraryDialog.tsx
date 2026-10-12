import { useState } from 'react';
import type { Actor } from '@virtuocity/core';
import { builtInActors, copyOfActor, currentBlueprint } from '@virtuocity/core';
import { Avatar, Button, Field, IconButton, Modal, Pill, Section, TextInput } from '@virtuocity/ui';
import { ActorDialog } from './ActorDialog';
import { openTextFile, saveTextFile } from './files';
import { useLibrary, useLibraryItems } from './library';
import type { PanelProps } from './types';

const run = (action: () => Promise<unknown>) =>
  void action().catch((error: unknown) => alert(`Something went wrong: ${String(error)}`));

function Row({
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

const BUILT_IN = <Pill>built-in</Pill>;

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
function Actors({ host, session }: PanelProps) {
  const library = useLibrary();
  const { actors } = useLibraryItems();
  const [editing, setEditing] = useState<Editing | null>(null);
  const builtIn = builtInActors(host.blueprints.list(), host.skills.list());
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

/** Built-in setups, then the casts you saved. Both start from New session. */
function Setups({ host }: Pick<PanelProps, 'host'>) {
  const library = useLibrary();
  const { setups } = useLibraryItems();
  return (
    <ul className="cast__list">
      {host.blueprints.list().map((b) => (
        <Row key={b.id} name={b.name} detail={b.roles.map((r) => r.personality.name).join(', ')}>
          {BUILT_IN}
        </Row>
      ))}
      {setups.map((setup) => (
        <Row
          key={setup.id}
          name={setup.name}
          detail={setup.actors.map((a) => a.personality.name).join(', ')}
        >
          <IconButton
            size="sm"
            icon="trash"
            label={`Delete ${setup.name} from the library`}
            onClick={() => run(() => library.remove(setup.id))}
          />
        </Row>
      ))}
    </ul>
  );
}

/** Saves the AI actors in the session, and the blueprint it came from, as a setup. */
function SaveSetup({ host, session }: PanelProps) {
  const library = useLibrary();
  const [name, setName] = useState('');
  const actors = session.actors.filter((a) => a.controller === 'ai');
  const save = () =>
    run(async () => {
      const blueprintId = currentBlueprint(session, host.blueprints)?.id;
      const description = actors.map((a) => a.personality.name).join(', ');
      await library.saveSetup({ name: name.trim(), description, blueprintId, actors });
      setName('');
    });
  return (
    <div className="library__save">
      <Field label="Setup name">
        {(id) => <TextInput id={id} value={name} onChange={(e) => setName(e.target.value)} />}
      </Field>
      <Button icon="bookmark" disabled={!name.trim() || actors.length === 0} onClick={save}>
        Save this cast
      </Button>
    </div>
  );
}

/** Actors and setups kept for reuse in any session, with export and import. */
export function LibraryDialog({
  host,
  session,
  open,
  onClose,
}: PanelProps & { open: boolean; onClose: () => void }) {
  const library = useLibrary();
  const exportFile = () =>
    run(async () => saveTextFile('virtuocity-library.json', await library.exportText()));
  const importFile = () =>
    run(async () => {
      const text = await openTextFile();
      if (text !== undefined) await library.importText(text);
    });
  const footer = (
    <>
      <Button variant="ghost" icon="download" onClick={exportFile}>
        Export
      </Button>
      <Button variant="ghost" icon="upload" onClick={importFile}>
        Import
      </Button>
      <Button variant="primary" onClick={onClose}>
        Done
      </Button>
    </>
  );
  return (
    <Modal open={open} title="Library" onClose={onClose} footer={footer}>
      <div className="stack">
        <Section title="Actors">
          <Actors host={host} session={session} />
        </Section>
        <Section title="Setups">
          <p className="muted">Start any setup from New session.</p>
          <Setups host={host} />
          <SaveSetup host={host} session={session} />
        </Section>
      </div>
    </Modal>
  );
}
