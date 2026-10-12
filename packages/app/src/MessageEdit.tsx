import { useState } from 'react';
import type { KeyboardEvent } from 'react';
import { Button, TextArea } from '@virtuocity/ui';

/** Editing a message in place: its text in a box, saved or cancelled. */
export function MessageEditor({
  text,
  onSave,
  onCancel,
}: {
  text: string;
  onSave: (text: string) => void;
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState(text);
  const save = () => (draft.trim() ? onSave(draft) : onCancel());
  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape') onCancel();
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) save();
  };
  return (
    <div className="message__edit">
      <TextArea
        autoFocus
        value={draft}
        rows={Math.min(16, Math.max(3, draft.split('\n').length + 1))}
        aria-label="Message text"
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={onKey}
      />
      <div className="message__edit-actions">
        <Button size="sm" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <Button size="sm" variant="primary" onClick={save}>
          Save
        </Button>
      </div>
    </div>
  );
}
