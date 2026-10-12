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
 * Deleting an actor the session uses: remove it from the session, or start a
 * new session without it. Either way nothing refers to a deleted actor.
 */
export function DeleteActorDialog({
  actor,
  onRemoveFromSession,
  onNewSession,
  onClose,
}: {
  actor: Actor;
  onRemoveFromSession: () => void;
  onNewSession: () => void;
  onClose: () => void;
}) {
  const name = actor.personality.name;
  const act = (choice: () => void) => () => {
    choice();
    onClose();
  };
  const footer = (
    <>
      <Button variant="ghost" onClick={onClose}>
        Cancel
      </Button>
      <Button onClick={act(onNewSession)}>Delete and start a new session</Button>
      <Button variant="primary" onClick={act(onRemoveFromSession)}>
        Delete and remove from the session
      </Button>
    </>
  );
  return (
    <Modal open title={`Delete ${name}`} onClose={onClose} footer={footer}>
      <p>
        {name} is in the current session. Deleting {name} also takes it out of the session: either
        remove {name} from it, or start a new session.
      </p>
    </Modal>
  );
}
