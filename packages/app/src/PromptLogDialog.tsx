import { useState, useSyncExternalStore } from 'react';
import { Button, Modal, Pill, Section } from '@virtuocity/ui';
import type { PromptLogEntry } from './promptLog';
import { PROMPT_LOG_SIZE, pretty, promptLog, shortenMedia } from './promptLog';

const raw = (text: string) => shortenMedia(pretty(text));

function statusOf(entry: PromptLogEntry): string {
  if (entry.error) return 'Failed';
  if (entry.response === undefined) return 'Running';
  return String(entry.status ?? '');
}

function EntryRow({ entry }: { entry: PromptLogEntry }) {
  return (
    <details className="trace" data-status={entry.error ? 'failed' : 'done'}>
      <summary>
        <span className="trace__who">{new Date(entry.at).toLocaleTimeString()}</span>
        <span className="trace__model">{entry.url}</span>
        <span className="trace__meta">
          <Pill>{statusOf(entry)}</Pill>
          {entry.ms !== undefined && <span>{(entry.ms / 1000).toFixed(1)}s</span>}
        </span>
      </summary>
      <div className="trace__details">
        <div className="trace__message">
          <span className="trace__role">prompt</span>
          <pre>{raw(entry.request)}</pre>
        </div>
        <div className="trace__message trace__message--answer">
          <span className="trace__role">{entry.error ? 'error' : 'raw return'}</span>
          <pre>{entry.error ?? (entry.response === undefined ? '…' : raw(entry.response))}</pre>
        </div>
      </div>
    </details>
  );
}

/** Settings section with a button that shows the last model calls as sent and received. */
export function PromptLogSection() {
  const [open, setOpen] = useState(false);
  const entries = useSyncExternalStore(promptLog.subscribe, promptLog.list);
  return (
    <Section title="Prompt log">
      <p className="settings-note">
        The last {PROMPT_LOG_SIZE} model calls of this tab exactly as they went to the provider and
        came back. Always on, kept only until you reload, keys never included.
      </p>
      <div className="segmented">
        <Button icon="activity" onClick={() => setOpen(true)}>
          Show prompt log
        </Button>
      </div>
      {open && (
        <Modal open size="lg" title="Prompt log" onClose={() => setOpen(false)} doneLabel="Done">
          <p className="settings-note">
            Newest first. Pictures are shortened to their size; everything else is raw.
          </p>
          {entries.length === 0 && <p className="muted">No model calls yet.</p>}
          <div className="traces">
            {entries.map((e) => (
              <EntryRow key={e.id} entry={e} />
            ))}
          </div>
        </Modal>
      )}
    </Section>
  );
}
