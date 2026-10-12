import { useState } from 'react';
import type { FormEvent } from 'react';
import type { Actor } from '@virtuocity/core';
import { sameName } from '@virtuocity/core';
import { Button, Modal, TransformTextContext } from '@virtuocity/ui';
import type { TransformAbout } from './transform';
import { useTransform } from './transform';
import type { Draft } from './ActorFields';
import { ActorFields } from './ActorFields';
import type { AppHost } from './types';

const EMPTY: Draft = {
  name: '',
  description: '',
  models: {},
  skillIds: ['conversation'],
  settings: {},
  profile: {},
};

function draftOf(actor: Actor | undefined): Draft {
  if (!actor) return EMPTY;
  return {
    name: actor.personality.name,
    description: actor.personality.description,
    models: actor.models ?? {},
    skillIds: actor.skillIds,
    settings: actor.settings ?? {},
    profile: actor.profile ?? {},
  };
}

const filled = (value: unknown) => value !== undefined && value !== '' && value !== null;

/** The actor a draft describes; settings of skills it no longer has are dropped. */
export function actorFromDraft(id: string, draft: Draft): Actor {
  const settings = Object.entries(draft.settings).filter(([skill]) =>
    draft.skillIds.includes(skill),
  );
  const profile = Object.entries(draft.profile).filter(([, value]) => filled(value));
  return {
    id,
    controller: 'ai',
    personality: { name: draft.name.trim(), description: draft.description.trim() },
    skillIds: [...draft.skillIds],
    ...(Object.keys(draft.models).length > 0 ? { models: draft.models } : {}),
    ...(settings.length > 0 ? { settings: Object.fromEntries(settings) } : {}),
    ...(profile.length > 0 ? { profile: Object.fromEntries(profile) } : {}),
  };
}

/** What "Transform by AI" may know about the actor being edited. */
function aboutDraft(host: AppHost, draft: Draft): TransformAbout {
  const profile = host.profileFields.list().flatMap((f) => {
    const value = draft.profile[f.id];
    return typeof value === 'string' ? [[f.label, value] as const] : [];
  });
  return { name: draft.name, known: [['Personality', draft.description], ...profile] };
}

function Footer(props: {
  editing: boolean;
  label: string;
  disabled: boolean;
  onSave: () => void;
  onCancel: () => void;
}) {
  return (
    <>
      {props.editing && (
        <span className="muted actor-dialog__note">Changes this actor everywhere.</span>
      )}
      <Button variant="ghost" onClick={props.onCancel}>
        Cancel
      </Button>
      <Button
        variant="primary"
        {...(props.editing ? {} : { icon: 'plus' as const })}
        disabled={props.disabled}
        onClick={props.onSave}
      >
        {props.label}
      </Button>
    </>
  );
}

/** Why the draft's name cannot be saved: empty, or another actor's. */
function nameProblem(name: string, takenNames: readonly string[]): string | undefined {
  if (!name.trim()) return 'Every actor needs a name.';
  const taken = takenNames.find((n) => sameName(n, name));
  return taken && `There is already an actor called ${taken}. Names are unique.`;
}

/**
 * Creates an AI actor, or edits one when `actor` is given. Models are optional
 * overrides of the defaults, per modality. Names are unique: `takenNames` are
 * the other actors' names. An actor is one actor wherever it is used, so
 * editing changes it in the library and in the session alike.
 */
export function ActorDialog({
  host,
  actor,
  open,
  onClose,
  onSave,
  takenNames,
  saveLabel = actor ? 'Save' : 'Create',
}: {
  host: AppHost;
  actor?: Actor | undefined;
  open: boolean;
  onClose: () => void;
  onSave: (actor: Actor) => void;
  takenNames: readonly string[];
  saveLabel?: string;
}) {
  const [draft, setDraft] = useState<Draft>(() => draftOf(actor));
  const problem = nameProblem(draft.name, takenNames);
  const transform = useTransform(aboutDraft(host, draft));

  const submit = (e?: FormEvent) => {
    e?.preventDefault();
    if (problem) return;
    onSave(actorFromDraft(actor?.id ?? crypto.randomUUID(), draft));
    onClose();
  };

  const footer = (
    <Footer
      editing={actor !== undefined}
      label={saveLabel}
      disabled={problem !== undefined}
      onSave={() => submit()}
      onCancel={onClose}
    />
  );

  return (
    <Modal
      open={open}
      size="lg"
      title={actor ? `Edit ${actor.personality.name}` : 'New actor'}
      onClose={onClose}
      footer={footer}
    >
      <TransformTextContext.Provider value={transform ?? null}>
        <form className="stack" onSubmit={submit}>
          <ActorFields
            host={host}
            draft={draft}
            onChange={setDraft}
            nameError={draft.name.trim() ? problem : undefined}
          />
        </form>
      </TransformTextContext.Provider>
    </Modal>
  );
}
