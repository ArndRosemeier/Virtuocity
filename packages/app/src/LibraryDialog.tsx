import { useState } from 'react';
import type { Blueprint, SavedSetup } from '@virtuocity/core';
import { builtInActors, currentBlueprint } from '@virtuocity/core';
import { Button, Field, IconButton, Modal, Section, TagPicker, TextInput } from '@virtuocity/ui';
import { openTextFile, saveTextFile } from './files';
import { useLibrary, useLibraryItems } from './library';
import { BUILT_IN, LibraryActors, Row, run } from './LibraryActors';
import { hasSkills, parseTags, skillTags } from './libraryTags';
import { LIBRARY_TAGS, useSetting } from './settings';
import type { PanelProps } from './types';

/** Built-in setups, then the casts you saved. Both start from New session. */
function Setups({
  blueprints,
  setups,
}: {
  blueprints: readonly Blueprint[];
  setups: readonly SavedSetup[];
}) {
  const library = useLibrary();
  return (
    <ul className="cast__list">
      {blueprints.map((b) => (
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

/**
 * Everything in the library, narrowed by skill tags. The tags are the installed
 * skills that library items use; the selection is remembered in this browser.
 */
function useFilteredLibrary(host: PanelProps['host']) {
  const { actors, setups } = useLibraryItems();
  const [stored, store] = useSetting(LIBRARY_TAGS);
  const builtIn = builtInActors(host.blueprints.list(), host.skills.list());
  const blueprintSkills = (b: Blueprint) =>
    builtIn.filter((x) => x.blueprint.id === b.id).flatMap((x) => x.actor.skillIds);
  const setupSkills = (s: SavedSetup) => s.actors.flatMap((a) => a.skillIds);
  const tags = skillTags(host.skills.list(), [
    ...builtIn.map((x) => x.actor.skillIds),
    ...actors.map((x) => x.actor.skillIds),
    ...host.blueprints.list().map(blueprintSkills),
    ...setups.map(setupSkills),
  ]);
  // Skills no item uses (or no longer installed) stay stored but do not filter.
  const selected = parseTags(stored).filter((id) => tags.some((t) => t.id === id));
  const shows = (skillIds: readonly string[]) => hasSkills(skillIds, selected);
  return {
    tags,
    selected,
    select: (next: readonly string[]) => store(JSON.stringify(next)),
    builtIn: builtIn.filter((x) => shows(x.actor.skillIds)),
    actors: actors.filter((x) => shows(x.actor.skillIds)),
    blueprints: host.blueprints.list().filter((b) => shows(blueprintSkills(b))),
    setups: setups.filter((s) => shows(setupSkills(s))),
  };
}

/** Actors and setups kept for reuse in any session, with export and import. */
export function LibraryDialog({
  host,
  session,
  open,
  onClose,
}: PanelProps & { open: boolean; onClose: () => void }) {
  const library = useLibrary();
  const view = useFilteredLibrary(host);
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
    <Modal open={open} size="lg" title="Library" onClose={onClose} footer={footer}>
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
              builtIn={view.builtIn}
              actors={view.actors}
            />
          </Section>
          <Section title="Setups">
            <p className="muted">Start any setup from New session.</p>
            <Setups blueprints={view.blueprints} setups={view.setups} />
            <SaveSetup host={host} session={session} />
          </Section>
        </div>
      </div>
    </Modal>
  );
}
