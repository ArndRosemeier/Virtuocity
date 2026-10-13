import { Button, Modal, Section, TagPicker } from '@virtuocity/ui';
import { openTextFile, saveTextFile } from './files';
import { useLibrary, useLibraryItems } from './library';
import { useResolveConflicts } from './conflicts';
import { LibraryActors, runSafely as run } from './LibraryActors';
import { hasSkills, parseTags, skillTags } from './libraryTags';
import { LIBRARY_TAGS, useSetting } from './settings';
import type { PanelProps } from './types';

/**
 * Everything in the library, narrowed by skill tags. The tags are the installed
 * skills that library items use; the selection is remembered in this browser.
 */
function useFilteredLibrary(host: PanelProps['host']) {
  const { actors } = useLibraryItems();
  const [stored, store] = useSetting(LIBRARY_TAGS);
  const all = actors.map((x) => x.actor);
  const tags = skillTags(
    host.skills.list(),
    all.map((a) => a.skillIds),
  );
  // Skills no item uses (or no longer installed) stay stored but do not filter.
  const selected = parseTags(stored).filter((id) => tags.some((t) => t.id === id));
  const shows = (skillIds: readonly string[]) => hasSkills(skillIds, selected);
  return {
    tags,
    selected,
    select: (next: readonly string[]) => store(JSON.stringify(next)),
    all,
    actors: actors.filter((x) => shows(x.actor.skillIds)),
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
 * Actors kept for reuse in any session (session types among them), with export
 * and import. `picking` is for adding one to the session (Add actor).
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
        <Section title="Actors">
          <LibraryActors
            host={host}
            session={session}
            actors={view.actors}
            names={view.all.map((a) => a.personality.name)}
            onAdded={picking ? onClose : undefined}
          />
        </Section>
      </div>
    </Modal>
  );
}
