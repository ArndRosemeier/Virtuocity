import { useState } from 'react';
import { Button, IconButton, Modal, Section } from '@virtuocity/ui';
import { Row, runSafely } from './LibraryActors';
import { SessionNameDialog } from './SessionName';
import type { SessionEntry } from './sessions';
import { useSessions, useSwitcher } from './switcher';

/** Asks before a session is deleted for good. */
function DeleteSession({ entry, onClose }: { entry: SessionEntry; onClose: () => void }) {
  const switcher = useSwitcher();
  const footer = (
    <>
      <Button variant="ghost" onClick={onClose}>
        Cancel
      </Button>
      <Button
        variant="primary"
        icon="trash"
        onClick={() => {
          runSafely(() => switcher.remove(entry.id));
          onClose();
        }}
      >
        Delete
      </Button>
    </>
  );
  return (
    <Modal open size="sm" title={`Delete ${entry.name}`} onClose={onClose} footer={footer}>
      <p>This deletes the session {entry.name} for good. Save it to a file first to keep it.</p>
    </Modal>
  );
}

/** One session: open it (a template starts a copy), mark it as a template, or delete it. */
function SessionRow({
  entry,
  open,
  onPick,
  onDelete,
}: {
  entry: SessionEntry;
  open: boolean;
  onPick: () => void;
  onDelete: () => void;
}) {
  const switcher = useSwitcher();
  const detail = open ? 'Open now' : entry.template ? 'Starts a new session from a copy' : '';
  return (
    <Row name={entry.name} detail={detail}>
      <label className="settings__check">
        <input
          type="checkbox"
          checked={entry.template}
          onChange={(e) =>
            runSafely(() => switcher.catalog.setTemplate(entry.id, e.target.checked))
          }
        />
        Template
      </label>
      {entry.template ? (
        <Button size="sm" variant="ghost" icon="copy" onClick={onPick}>
          Use
        </Button>
      ) : (
        !open && (
          <Button size="sm" variant="ghost" onClick={onPick}>
            Open
          </Button>
        )
      )}
      <IconButton size="sm" icon="trash" label={`Delete ${entry.name}`} onClick={onDelete} />
    </Row>
  );
}

/** Every saved session and template: switch between them, start from a template, delete. */
export function SessionsDialog({ onNew, onClose }: { onNew: () => void; onClose: () => void }) {
  const switcher = useSwitcher();
  const { entries, openId } = useSessions();
  const [copying, setCopying] = useState<SessionEntry | null>(null);
  const [deleting, setDeleting] = useState<SessionEntry | null>(null);
  const pick = (entry: SessionEntry) => {
    if (entry.template) return setCopying(entry);
    runSafely(() => switcher.open(entry.id));
    onClose();
  };
  const list = (template: boolean) => (
    <ul className="cast__list">
      {entries
        .filter((e) => e.template === template)
        .map((entry) => (
          <SessionRow
            key={entry.id}
            entry={entry}
            open={entry.id === openId}
            onPick={() => pick(entry)}
            onDelete={() => setDeleting(entry)}
          />
        ))}
    </ul>
  );
  const hasTemplates = entries.some((e) => e.template);
  return (
    <Modal open title="Sessions" onClose={onClose}>
      <div className="stack">
        <Button icon="plus" className="library__new" onClick={onNew}>
          New session
        </Button>
        <Section title="Sessions">{list(false)}</Section>
        <Section title="Templates">
          {hasTemplates ? (
            list(true)
          ) : (
            <p className="muted">
              Tick Template on a session to start new sessions from copies of it.
            </p>
          )}
        </Section>
      </div>
      {copying && (
        <SessionNameDialog
          title={`New session from ${copying.name}`}
          note={`The new session starts as a copy of ${copying.name}; the template stays as it is.`}
          onStart={(name) => runSafely(() => switcher.copy(copying.id, name).then(onClose))}
          onClose={() => setCopying(null)}
        />
      )}
      {deleting && <DeleteSession entry={deleting} onClose={() => setDeleting(null)} />}
    </Modal>
  );
}
