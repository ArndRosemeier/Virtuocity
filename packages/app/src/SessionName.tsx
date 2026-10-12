import { useState } from 'react';
import { Button, Field, Modal, TextInput } from '@virtuocity/ui';
import { sessionNameProblem } from './sessions';
import { useSessions } from './switcher';

/** A name for a new session, with what is wrong with it while it cannot be used. */
export function useSessionName() {
  const { entries } = useSessions();
  const [name, setName] = useState('');
  const problem = sessionNameProblem(
    name,
    entries.map((e) => e.name),
  );
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
  return { name: name.trim(), ok: problem === undefined, field };
}

/** Cancel, and Start once the new session's name can be used. */
export function StartFooter({
  ok,
  onStart,
  onClose,
}: {
  ok: boolean;
  onStart: () => void;
  onClose: () => void;
}) {
  return (
    <>
      <Button variant="ghost" onClick={onClose}>
        Cancel
      </Button>
      <Button variant="primary" icon="sparkles" disabled={!ok} onClick={onStart}>
        Start
      </Button>
    </>
  );
}

/** Asks for the name of a session that starts from a copy (of a template, or a file). */
export function SessionNameDialog({
  title,
  note,
  onStart,
  onClose,
}: {
  title: string;
  note: string;
  onStart: (name: string) => void;
  onClose: () => void;
}) {
  const { name, ok, field } = useSessionName();
  const start = () => {
    if (!ok) return;
    onStart(name);
    onClose();
  };
  const footer = <StartFooter ok={ok} onStart={start} onClose={onClose} />;
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
