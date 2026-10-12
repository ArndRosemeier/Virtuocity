import { useState } from 'react';
import type { Actor, Blueprint, SavedSetup } from '@virtuocity/core';
import { currentBlueprint } from '@virtuocity/core';
import { Pill } from '@virtuocity/ui';
import { Button, Field, IconButton, Modal, Section, TagPicker, TextInput } from '@virtuocity/ui';
import { openTextFile, saveTextFile } from './files';
import { isLibraryActor, setupNames, useLibrary, useLibraryItems } from './library';
import { useResolveConflicts } from './conflicts';
import { LibraryActors, Row, runSafely as run } from './LibraryActors';
import { hasSkills, parseTags, skillTags } from './libraryTags';
import { LIBRARY_TAGS, useSetting } from './settings';
import type { PanelProps } from './types';

/**
 * Built-in setups (a layout and a guide; they bring no actors), then the casts
 * you saved. Both start from New session.
 */
function Setups({
  blueprints,
  setups,
  actors,
}: {
  blueprints: readonly Blueprint[];
  setups: readonly SavedSetup[];
  actors: readonly Actor[];
}) {
  const library = useLibrary();
  return (
    <ul className="cast__list">
      {blueprints.map((b) => (
        <Row key={b.id} name={b.name} detail={b.description}>
          <Pill>built-in</Pill>
        </Row>
      ))}
      {setups.map((setup) => (
        <Row key={setup.id} name={setup.name} detail={setupNames(setup, actors).join(', ')}>
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
  const actors = session.actors.filter(isLibraryActor);
  const save = () =>
    run(async () => {
      const blueprintId = currentBlueprint(session, host.blueprints)?.id;
      const description = actors.map((a) => a.personality.name).join(', ');
      const actorIds = actors.map((a) => a.id);
      await library.saveSetup({ name: name.trim(), description, blueprintId, actorIds });
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

/**
 * Everything in the library, narrowed by skill tags. The tags are the installed
 * skills that library items use; the selection is remembered in this browser.
 */
function useFilteredLibrary(host: PanelProps['host']) {
  const { actors, setups } = useLibraryItems();
  const [stored, store] = useSetting(LIBRARY_TAGS);
  const all = actors.map((x) => x.actor);
  const setupSkills = (s: SavedSetup) =>
    s.actorIds.flatMap((id) => all.find((a) => a.id === id)?.skillIds ?? []);
  const tags = skillTags(host.skills.list(), [
    ...all.map((a) => a.skillIds),
    ...setups.map(setupSkills),
  ]);
  // Skills no item uses (or no longer installed) stay stored but do not filter.
  const selected = parseTags(stored).filter((id) => tags.some((t) => t.id === id));
  const shows = (skillIds: readonly string[]) => hasSkills(skillIds, selected);
  return {
    tags,
    selected,
    select: (next: readonly string[]) => store(JSON.stringify(next)),
    all,
    actors: actors.filter((x) => shows(x.actor.skillIds)),
    setups: setups.filter((s) => shows(setupSkills(s))),
  };
}

/** Export and import the whole library as one file. */
function LibraryFooter({ onClose }: { onClose: () => void }) {
  const library = useLibrary();
  const resolve = useResolveConflicts();
  const exportFile = () =>
    run(async () => saveTextFile('virtuocity-library.json', await library.exportText()));
  const importFile = () =>
    run(async () => {
      const text = await openTextFile();
      if (text !== undefined) await library.importText(text, resolve);
    });
  return (
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
}

/**
 * Actors and setups kept for reuse in any session, with export and import.
 * `picking` shows only actors, to add one to the session (Add actor).
 */
export function LibraryDialog({
  host,
  session,
  open,
  onClose,
  picking = false,
}: PanelProps & { open: boolean; onClose: () => void; picking?: boolean }) {
  const view = useFilteredLibrary(host);
  return (
    <Modal
      open={open}
      size="lg"
      title={picking ? 'Add actor' : 'Library'}
      onClose={onClose}
      footer={picking ? undefined : <LibraryFooter onClose={onClose} />}
    >
      <div className="stack">
        <TagPicker
          label="Show items with these skills"
          tags={view.tags}
          selected={view.selected}
          onChange={view.select}
        />
        <div className="library__columns">
          <Section title="Actors">
            <LibraryActors
              host={host}
              session={session}
              actors={view.actors}
              names={view.all.map((a) => a.personality.name)}
              onAdded={picking ? onClose : undefined}
            />
          </Section>
          {!picking && (
            <Section title="Setups">
              <p className="muted">Start any setup from New session.</p>
              <Setups blueprints={host.blueprints.list()} setups={view.setups} actors={view.all} />
              <SaveSetup host={host} session={session} />
            </Section>
          )}
        </div>
      </div>
    </Modal>
  );
}
