import type { Actor } from '@virtuocity/core';
import { Field, IconButton, TextInput } from '@virtuocity/ui';
import { useAppActions } from './actions';

/**
 * The session's type, shown like its view: every session has exactly one. It
 * cannot be swapped, only opened for editing (its roles, panels and cast).
 */
export function SessionTypeField({ type }: { type: Actor }) {
  const { openEditActor } = useAppActions();
  return (
    <div className="cast__fixture">
      <Field label="Session type" hint="What kind of session this is; it stays for good.">
        {(id) => <TextInput id={id} readOnly value={type.personality.name} />}
      </Field>
      <IconButton
        icon="edit"
        label={`Edit ${type.personality.name}`}
        onClick={() => openEditActor(type.id)}
      />
    </div>
  );
}
