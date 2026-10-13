import { useState } from 'react';
import type { KeyboardEvent } from 'react';
import { Button, TextArea } from '@virtuocity/ui';

/**
 * Editing a message in place. Leaving the box (clicking elsewhere, or
 * Ctrl+Enter) keeps the change; Revert or Escape drops it.
 */
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
  const finish = () => (draft.trim() && draft !== text ? onSave(draft) : onCancel());
  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape') onCancel();
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) finish();
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
        onBlur={finish}
      />
      <div className="message__edit-actions">
        {/* Pressing Revert must not blur the box first, which would keep the change. */}
        <Button
          size="sm"
          variant="ghost"
          onMouseDown={(e) => e.preventDefault()}
          onClick={onCancel}
        >
          Revert
        </Button>
      </div>
    </div>
  );
}
