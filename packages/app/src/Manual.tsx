import { useState } from 'react';
import { Button, Modal } from '@virtuocity/ui';
import { richText } from '@virtuocity/skill-roleplay-view';
import { RichTextView } from './RichText';
import manual from './manual.md?raw';

const MANUAL = richText(manual);

/** Opens the user manual: what Virtuocity is, how to use it, and its less common ideas. */
export function Manual() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="ghost" onClick={() => setOpen(true)}>
        Manual
      </Button>
      <Modal open={open} title="Manual" onClose={() => setOpen(false)} doneLabel="Done">
        <div className="manual">
          <RichTextView text={MANUAL} />
        </div>
      </Modal>
    </>
  );
}
