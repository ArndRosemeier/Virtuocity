import { useState } from 'react';
import type { Actor } from '@virtuocity/core';
import { Avatar, Button, IconButton, Pill } from '@virtuocity/ui';
import { useAppActions } from './actions';
import { useLibrary } from './library';
import type { AppModule, PanelProps } from './types';

const SAVED_NOTE_MS = 2000;

/** Who is in the scene; actors can join and leave at any time. */
function CastPanel({ session }: PanelProps) {
  const { openNewActor, openEditActor } = useAppActions();
  const library = useLibrary();
  const [saved, setSaved] = useState<string | null>(null);
  const save = (actor: Actor) =>
    void library.saveActor(actor).then(() => {
      setSaved(actor.id);
      setTimeout(() => setSaved(null), SAVED_NOTE_MS);
    });
  const cast = session.actors.filter((a) => a.controller === 'ai');
  return (
    <div className="cast">
      {cast.length === 0 && (
        <p className="muted">Nobody here yet. Add an actor to start the scene.</p>
      )}
      <ul className="cast__list">
        {cast.map((a) => (
          <li key={a.id} className="cast__item" data-speaking={session.speaking === a.id}>
            <Avatar name={a.personality.name} />
            <div className="cast__info">
              <strong>{a.personality.name}</strong>
              <span className="cast__meta">
                {Object.entries(a.models ?? {}).map(([modality, model]) => (
                  <Pill key={modality} title={`${modality} model`}>
                    {model}
                  </Pill>
                ))}
                {session.speaking === a.id && <Pill tone="accent">writing…</Pill>}
                {saved === a.id && <Pill tone="accent">saved to library</Pill>}
              </span>
            </div>
            <IconButton
              size="sm"
              icon="bookmark"
              label={`Save ${a.personality.name} to the library`}
              onClick={() => save(a)}
            />
            <IconButton
              size="sm"
              icon="edit"
              label={`Edit ${a.personality.name}`}
              onClick={() => openEditActor(a.id)}
            />
            <IconButton
              size="sm"
              icon="trash"
              label={`Remove ${a.personality.name}`}
              onClick={() => void session.leave(a.id)}
            />
          </li>
        ))}
      </ul>
      <Button icon="plus" onClick={openNewActor}>
        Add actor
      </Button>
    </div>
  );
}

export const castPanelModule: AppModule = {
  id: 'cast-panel',
  register: (host) =>
    host.panels.register({ id: 'cast', title: 'Cast', slot: 'side', component: CastPanel }),
};
