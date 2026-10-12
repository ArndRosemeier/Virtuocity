import { useState } from 'react';
import type { Chronicle, MemoryOp } from '@virtuocity/skill-chronicler';
import { MEMORY, chronicles, memoryDoc } from '@virtuocity/skill-chronicler';
import { Button, TextArea } from '@virtuocity/ui';
import type { AppModule, PanelProps } from './types';
import { USER_ID } from './useSession';

interface EntryProps {
  readonly name: string;
  readonly chronicle: Chronicle;
  readonly covers: number;
  readonly onSave: (summary: string) => void;
  readonly onRebuild: () => void;
}

/** One chronicler's summary, which you can correct or have rebuilt. */
function Entry({ name, chronicle, covers, onSave, onRebuild }: EntryProps) {
  const [draft, setDraft] = useState<string | null>(null);
  return (
    <section className="memory__entry">
      <strong>{name}</strong>
      <span className="muted">
        {' '}
        covers the first {covers} {covers === 1 ? 'message' : 'messages'}
      </span>
      {draft === null ? (
        <p className="memory__summary">{chronicle.summary}</p>
      ) : (
        <TextArea
          aria-label={`Summary by ${name}`}
          rows={8}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
        />
      )}
      <div className="row">
        {draft === null ? (
          <>
            <Button
              size="sm"
              variant="ghost"
              icon="edit"
              onClick={() => setDraft(chronicle.summary)}
            >
              Edit
            </Button>
            <Button size="sm" variant="ghost" onClick={onRebuild}>
              Rebuild
            </Button>
          </>
        ) : (
          <>
            <Button
              size="sm"
              disabled={!draft.trim()}
              onClick={() => {
                onSave(draft.trim());
                setDraft(null);
              }}
            >
              Save
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setDraft(null)}>
              Cancel
            </Button>
          </>
        )}
      </div>
    </section>
  );
}

/**
 * What the actors remember of the story beyond what they can read. Only their
 * model calls use it; the story itself always stays complete.
 */
function MemoryPanel({ session }: PanelProps) {
  const view = session.workspace.view(USER_ID);
  const entries = Object.entries(chronicles(view));
  const messages = session.transcript(USER_ID);
  const change = (op: MemoryOp) => void view.change(MEMORY, memoryDoc, op);
  if (entries.length === 0) {
    return (
      <p className="muted">
        No summary yet. A chronicler writes one once the story grows longer than the actors can
        read. The story itself always stays complete.
      </p>
    );
  }
  return (
    <div className="stack memory">
      {entries.map(([chroniclerId, chronicle]) => (
        <Entry
          key={chroniclerId}
          name={session.actors.find((a) => a.id === chroniclerId)?.personality.name ?? 'Someone'}
          chronicle={chronicle}
          covers={messages.findIndex((m) => m.id === chronicle.upTo) + 1}
          onSave={(summary) => change({ type: 'set', chroniclerId, summary, upTo: chronicle.upTo })}
          onRebuild={() => change({ type: 'forget', chroniclerId })}
        />
      ))}
    </div>
  );
}

export const memoryPanelModule: AppModule = {
  id: 'memory-panel',
  register: (host) =>
    host.panels.register({ id: 'memory', title: 'Memory', slot: 'side', component: MemoryPanel }),
};
