import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import { Button, IconButton } from './Button';
import { cx } from './cx';

export interface ModalProps {
  readonly open: boolean;
  readonly title: string;
  readonly onClose: () => void;
  readonly children: ReactNode;
  readonly footer?: ReactNode;
  /** Shows a primary button with this label that closes the dialog, when there is no footer. */
  readonly doneLabel?: string;
  readonly size?: 'sm' | 'md';
}

/** A native <dialog>: focus trapping, Escape and the backdrop come from the browser. */
export function Modal({
  open,
  title,
  onClose,
  children,
  footer,
  doneLabel,
  size = 'md',
}: ModalProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const done = doneLabel && (
    <Button variant="primary" onClick={onClose}>
      {doneLabel}
    </Button>
  );

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      className={cx('v-modal', size === 'sm' && 'v-modal--sm')}
      aria-label={title}
      onClose={onClose}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <header className="v-modal__header">
        <h2 className="v-modal__title">{title}</h2>
        <IconButton icon="close" label="Close" onClick={onClose} />
      </header>
      <div className="v-modal__body">{open && children}</div>
      {(footer ?? done) && <footer className="v-modal__footer">{footer ?? done}</footer>}
    </dialog>
  );
}
