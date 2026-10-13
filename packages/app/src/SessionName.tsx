import { useState } from 'react';
import { Button, Field, Modal, TextInput } from '@virtuocity/ui';
import { sessionNameProblem } from './sessions';
import { useSessions } from './switcher';

/**
 * A name for a session, with what is wrong with it while it cannot be used.
 * `renaming` is the id of a session being renamed: its own name is not taken.
 */
export function useSessionName(initial = '', renaming?: string) {
  const { entries } = useSessions();
  const [name, setName] = useState(initial);
  const taken = entries.filter((e) => e.id !== renaming).map((e) => e.name);
  const problem = sessionNameProblem(name, taken);
  const field = (
    <Field
      label="Session name"
      hint={name && problem ? <span className="composer__error">{problem}</span> : undefined}
    >
      {(id) => (
        <TextInput id={id} autoFocus value={name} onChange={(e) => setName(e.target.value)} />
      )}
    </Field>
  );
  return { name: name.trim(), ok: problem === undefined, field, typed: name, setName, taken };
}

/** Cancel, and Start (or another action) once the session's name can be used. */
export function StartFooter({
  ok,
  onStart,
  onClose,
  label = 'Start',
}: {
  ok: boolean;
  onStart: () => void;
  onClose: () => void;
  label?: string;
}) {
  return (
    <>
      <Button variant="ghost" onClick={onClose}>
        Cancel
      </Button>
      <Button variant="primary" icon="sparkles" disabled={!ok} onClick={onStart}>
        {label}
      </Button>
    </>
  );
}

/** Asks for a session's name: one that starts from a copy (of a template, or a file), or a new name. */
export function SessionNameDialog({
  title,
  note,
  onStart,
  onClose,
  renaming,
}: {
  title: string;
  note: string;
  onStart: (name: string) => void;
  onClose: () => void;
  /** The session being renamed: its name is filled in and the button says Rename. */
  renaming?: { readonly id: string; readonly name: string } | undefined;
}) {
  const { name, ok, field } = useSessionName(renaming?.name, renaming?.id);
  const start = () => {
    if (!ok) return;
    onStart(name);
    onClose();
  };
  const footer = (
    <StartFooter ok={ok} onStart={start} onClose={onClose} label={renaming ? 'Rename' : 'Start'} />
  );
  return (
    <Modal open size="sm" title={title} onClose={onClose} footer={footer}>
      <form
        className="stack"
        onSubmit={(e) => {
          e.preventDefault();
          start();
        }}
      >
        <p className="muted">{note}</p>
        {field}
      </form>
    </Modal>
  );
}
