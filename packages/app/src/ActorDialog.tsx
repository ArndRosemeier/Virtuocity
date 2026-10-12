import { useState } from 'react';
import type { FormEvent } from 'react';
import type { Actor, SessionRuntime } from '@virtuocity/core';
import { Button, Modal } from '@virtuocity/ui';
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

/**
 * Creates an AI actor, or edits one when `actor` is given. Models are optional
 * overrides of the defaults, per modality. Saving joins the session, unless
 * `onSave` says where the actor goes instead (e.g. back into the library).
 */
export function ActorDialog({
  host,
  session,
  actor,
  open,
  onClose,
  onSave = (next) => void session.join(next),
}: {
  host: AppHost;
  session: SessionRuntime;
  actor?: Actor | undefined;
  open: boolean;
  onClose: () => void;
  onSave?: (actor: Actor) => void;
}) {
  const [draft, setDraft] = useState<Draft>(() => draftOf(actor));

  const submit = (e?: FormEvent) => {
    e?.preventDefault();
    if (!draft.name.trim()) return;
    onSave(actorFromDraft(actor?.id ?? crypto.randomUUID(), draft));
    onClose();
  };

  const footer = (
    <>
      <Button variant="ghost" onClick={onClose}>
        Cancel
      </Button>
      <Button
        variant="primary"
        {...(actor ? {} : { icon: 'plus' as const })}
        disabled={!draft.name.trim()}
        onClick={() => submit()}
      >
        {actor ? 'Save' : 'Add to scene'}
      </Button>
    </>
  );

  return (
    <Modal
      open={open}
      size="sm"
      title={actor ? `Edit ${actor.personality.name}` : 'New actor'}
      onClose={onClose}
      footer={footer}
    >
      <form className="stack" onSubmit={submit}>
        <ActorFields host={host} draft={draft} onChange={setDraft} />
      </form>
    </Modal>
  );
}
