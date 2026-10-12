import { useState } from 'react';
import type { Actor } from '@virtuocity/core';
import { sameName } from '@virtuocity/core';
import { Button, Field, Modal, TextInput } from '@virtuocity/ui';

/** Copying asks for a new name, since a name is one actor. */
export function CopyActorDialog({
  actor,
  takenNames,
  onCopy,
  onClose,
}: {
  actor: Actor;
  takenNames: readonly string[];
  onCopy: (copy: Actor) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState('');
  const taken = takenNames.find((n) => sameName(n, name));
  const ok = name.trim() !== '' && !taken;
  const hint = taken ? (
    <span className="composer__error">There is already an actor called {taken}.</span>
  ) : (
    'The copy is a separate actor with everything else the same.'
  );
  const copy = () => {
    if (!ok) return;
    const personality = { ...actor.personality, name: name.trim() };
    onCopy({ ...actor, id: crypto.randomUUID(), personality });
    onClose();
  };
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    copy();
  };
  const footer = (
    <>
      <Button variant="ghost" onClick={onClose}>
        Cancel
      </Button>
      <Button variant="primary" icon="copy" disabled={!ok} onClick={copy}>
        Copy
      </Button>
    </>
  );
  return (
    <Modal
      open
      size="sm"
      title={`Copy ${actor.personality.name}`}
      onClose={onClose}
      footer={footer}
    >
      <form className="stack" onSubmit={submit}>
        <Field label="Name of the copy" hint={hint}>
          {(id) => (
            <TextInput id={id} autoFocus value={name} onChange={(e) => setName(e.target.value)} />
          )}
        </Field>
      </form>
    </Modal>
  );
}

/**
 * Deleting an actor the session uses deletes that session too, after this
 * warning, so nothing ever refers to a deleted actor.
 */
export function DeleteActorDialog({
  actor,
  onDelete,
  onClose,
}: {
  actor: Actor;
  onDelete: () => void;
  onClose: () => void;
}) {
  const name = actor.personality.name;
  const footer = (
    <>
      <Button variant="ghost" onClick={onClose}>
        Cancel
      </Button>
      <Button
        variant="primary"
        icon="trash"
        onClick={() => {
          onDelete();
          onClose();
        }}
      >
        Delete {name} and the session
      </Button>
    </>
  );
  return (
    <Modal open size="sm" title={`Delete ${name}`} onClose={onClose} footer={footer}>
      <p>
        {name} is in the current session, so deleting {name} also deletes that session. Save the
        session to a file first if you want to keep it.
      </p>
    </Modal>
  );
}
