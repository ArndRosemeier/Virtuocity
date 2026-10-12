import { useState } from 'react';
import type { SessionRuntime } from '@virtuocity/core';
import { currentBlueprint } from '@virtuocity/core';
import { Avatar, Button, Field, IconButton, Modal, Section, TextInput } from '@virtuocity/ui';
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

function SavedActors({ session }: { session: SessionRuntime }) {
  const library = useLibrary();
  const { actors } = useLibraryItems();
  if (actors.length === 0) {
    return <p className="muted">Save an actor with the bookmark next to their name in the cast.</p>;
  }
  return (
    <ul className="cast__list">
      {actors.map(({ id, actor }) => (
        <Row key={id} name={actor.personality.name} detail={actor.personality.description}>
          <Button
            size="sm"
            icon="plus"
            onClick={() => run(() => session.join({ ...actor, id: crypto.randomUUID() }))}
          >
            Add
          </Button>
          <IconButton
            size="sm"
            icon="trash"
            label={`Delete ${actor.personality.name} from the library`}
            onClick={() => run(() => library.remove(id))}
          />
        </Row>
      ))}
    </ul>
  );
}

function SavedSetups() {
  const library = useLibrary();
  const { setups } = useLibraryItems();
  if (setups.length === 0) return <p className="muted">No saved setups yet.</p>;
  return (
    <ul className="cast__list">
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
          <SavedActors session={session} />
        </Section>
        <Section title="Setups">
          <p className="muted">Start a saved setup from New session.</p>
          <SavedSetups />
          <SaveSetup host={host} session={session} />
        </Section>
      </div>
    </Modal>
  );
}
