import { useState } from 'react';
import type { Actor } from '@virtuocity/core';
import { copyOfActor } from '@virtuocity/core';
import { Avatar, Button, IconButton, Pill } from '@virtuocity/ui';
import { useAppActions } from './actions';
import { useLibrary } from './library';
import { StoryViewPicker } from './StoryViewPicker';
import { STORY_VIEW } from './storyView';
import type { AppModule, PanelProps } from './types';

const SAVED_NOTE_MS = 2000;

interface CastRowProps {
  readonly actor: Actor;
  readonly speaking: boolean;
  readonly saved: boolean;
  readonly onSave: () => void;
  readonly onCopy: () => void;
  readonly onLeave: () => void;
}

/** One actor in the scene, with save, copy, edit and remove. */
function CastRow({ actor: a, speaking, saved, onSave, onCopy, onLeave }: CastRowProps) {
  const { openEditActor } = useAppActions();
  return (
    <li className="cast__item" data-speaking={speaking}>
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
          {saved && <Pill tone="accent">saved to library</Pill>}
        </span>
      </div>
      <IconButton
        size="sm"
        icon="bookmark"
        label={`Save ${a.personality.name} to the library`}
        onClick={onSave}
      />
      <IconButton size="sm" icon="copy" label={`Copy ${a.personality.name}`} onClick={onCopy} />
      <IconButton
        size="sm"
        icon="edit"
        label={`Edit ${a.personality.name}`}
        onClick={() => openEditActor(a.id)}
      />
      <IconButton size="sm" icon="trash" label={`Remove ${a.personality.name}`} onClick={onLeave} />
    </li>
  );
}

/**
 * Who is in the scene: the cast (actors who talk) and, apart from it, support
 * actors who work behind the scenes. Actors can join and leave at any time.
 */
function CastPanel({ host, session }: PanelProps) {
  const { openNewActor, openEditActor } = useAppActions();
  const library = useLibrary();
  const [saved, setSaved] = useState<string | null>(null);
  /** Adds a copy to the scene and opens it, so a variation is one edit away. */
  const copy = (actor: Actor) => {
    const id = crypto.randomUUID();
    void session.join(copyOfActor(actor, id)).then(() => openEditActor(id));
  };
  const save = (actor: Actor) =>
    void library.saveActor(actor).then(() => {
      setSaved(actor.id);
      setTimeout(() => setSaved(null), SAVED_NOTE_MS);
    });
  const row = (a: Actor) => (
    <CastRow
      key={a.id}
      actor={a}
      speaking={session.speaking === a.id}
      saved={saved === a.id}
      onSave={() => save(a)}
      onCopy={() => copy(a)}
      onLeave={() => void session.leave(a.id)}
    />
  );
  const cast = session.cast().filter((a) => a.controller === 'ai');
  const support = session.actors.filter(
    (a) => a.controller === 'ai' && a.id !== STORY_VIEW && !cast.some((c) => c.id === a.id),
  );
  return (
    <div className="cast">
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
      <Button icon="plus" onClick={openNewActor}>
        Add actor
      </Button>
      <StoryViewPicker host={host} session={session} />
    </div>
  );
}

export const castPanelModule: AppModule = {
  id: 'cast-panel',
  register: (host) =>
    host.panels.register({ id: 'cast', title: 'Cast', slot: 'side', component: CastPanel }),
};
