import { useState } from 'react';
import type { Actor } from '@virtuocity/core';
import { isSessionType, withdraw } from '@virtuocity/core';
import { Avatar, Button, IconButton, Pill } from '@virtuocity/ui';
import { useAppActions } from './actions';
import { useActorTips } from './actorTips';
import { runSafely } from './LibraryActors';
import { SessionGoesDialog } from './SessionGoesDialog';
import { SessionTypeField } from './SessionTypeField';
import { SetupGuide } from './SetupGuide';
import { StoryViewPicker } from './StoryViewPicker';
import { STORY_VIEW } from './storyView';
import type { AppModule, PanelProps } from './types';
import { useSwitcher } from './switcher';

interface CastRowProps {
  readonly actor: Actor;
  readonly speaking: boolean;
  readonly onLeave: () => void;
}

/** One actor in the scene, with edit and remove. Editing changes the actor in the library too. */
function CastRow({ actor: a, speaking, onLeave }: CastRowProps) {
  const { openEditActor } = useAppActions();
  const tip = useActorTips()(a);
  return (
    <li className="cast__item" data-speaking={speaking} title={tip}>
      <Avatar name={a.personality.name} />
      <div className="cast__info">
        <strong>{a.personality.name}</strong>
        <span className="cast__meta">
          {Object.entries(a.models ?? {}).map(([modality, model]) => (
            <Pill key={modality} title={`${modality} model`}>
              {model}
            </Pill>
          ))}
          {speaking && <Pill tone="accent">writing…</Pill>}
        </span>
      </div>
      <IconButton
        size="sm"
        icon="edit"
        label={`Edit ${a.personality.name}`}
        onClick={() => openEditActor(a.id)}
      />
      <IconButton
        size="sm"
        icon="trash"
        label={`Remove ${a.personality.name} from the session`}
        onClick={onLeave}
      />
    </li>
  );
}

/**
 * Removing an actor nobody has built on yet is clean: what it did goes with it.
 * One whose work the session went on from stays part of the session, so removing it
 * deletes the session, after a warning.
 */
function useRemove({ session }: PanelProps) {
  const switcher = useSwitcher();
  const [actor, setActor] = useState<Actor>();
  const remove = (a: Actor) => {
    void withdraw(session, a.id).then((gone) => {
      if (!gone) setActor(a);
    });
  };
  const name = actor?.personality.name ?? '';
  const dialog = actor && (
    <SessionGoesDialog
      title={`Remove ${name}`}
      confirm="Delete the session"
      onConfirm={() => runSafely(() => switcher.removeOpen())}
      onClose={() => setActor(undefined)}
    >
      The session has gone on since {name} took part, so removing {name} means deleting the session.{' '}
      {name} stays in your Library.
    </SessionGoesDialog>
  );
  return [remove, dialog] as const;
}

/**
 * Who is in the session: the cast (actors with one of the session type's cast
 * skills) and, apart from it, support actors, who can all join and leave at
 * any time. Below them the two every session has exactly one of: its type
 * (kept for good) and its view.
 */
function CastPanel({ host, session }: PanelProps) {
  const { openAddActor } = useAppActions();
  const [remove, removeDialog] = useRemove({ host, session });
  const fixed = (a: Actor) => isSessionType(a, host.skills.list());
  const row = (a: Actor) => (
    <CastRow key={a.id} actor={a} speaking={session.speaking === a.id} onLeave={() => remove(a)} />
  );
  const type = session.actors.find(fixed);
  const cast = session.cast().filter((a) => a.controller === 'ai');
  const support = session.actors.filter(
    (a) =>
      a.controller === 'ai' && a.id !== STORY_VIEW && !fixed(a) && !cast.some((c) => c.id === a.id),
  );
  return (
    <div className="cast">
      <SetupGuide host={host} session={session} />
      {cast.length === 0 && (
        <p className="muted">Nobody here yet. Add an actor to start the scene.</p>
      )}
      <ul className="cast__list">{cast.map(row)}</ul>
      {support.length > 0 && (
        <>
          <h3 className="cast__group">Support</h3>
          <ul className="cast__list" aria-label="Support">
            {support.map(row)}
          </ul>
        </>
      )}
      <Button icon="plus" onClick={openAddActor}>
        Add actor
      </Button>
      {type && <SessionTypeField type={type} />}
      <StoryViewPicker host={host} session={session} />
      {removeDialog}
    </div>
  );
}

export const castPanelModule: AppModule = {
  id: 'cast-panel',
  register: (host) =>
    host.panels.register({ id: 'cast', title: 'Cast', slot: 'side', component: CastPanel }),
};
