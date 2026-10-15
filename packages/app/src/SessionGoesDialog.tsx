import type { ReactNode } from 'react';
import { Button, Modal } from '@virtuocity/ui';

/**
 * Warns before an action that throws the current session away: deleting it (so
 * nothing in a session ever refers to an actor it no longer has) or clearing it.
 */
export function SessionGoesDialog({
  title,
  confirm,
  children,
  onConfirm,
  onClose,
}: {
  title: string;
  /** The confirm button's label. */
  confirm: string;
  /** Why the session goes. */
  children: ReactNode;
  onConfirm: () => void;
  onClose: () => void;
}) {
  const footer = (
    <>
      <Button variant="ghost" onClick={onClose}>
        Cancel
      </Button>
      <Button
        variant="primary"
        icon="trash"
        onClick={() => {
          onConfirm();
          onClose();
        }}
      >
        {confirm}
      </Button>
    </>
  );
  return (
    <Modal open size="sm" title={title} onClose={onClose} footer={footer}>
      <p>{children} Save to a file first if you want to keep it.</p>
    </Modal>
  );
}
