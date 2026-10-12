import { Avatar, Button, IconButton, Pill } from '@virtuocity/ui';
import { useAppActions } from './actions';
import type { AppModule, PanelProps } from './types';

/** Who is in the scene; characters can join and leave at any time. */
function CastPanel({ session }: PanelProps) {
  const { openNewCharacter } = useAppActions();
  const cast = session.actors.filter((a) => a.controller === 'ai');
  return (
    <div className="cast">
      {cast.length === 0 && (
        <p className="muted">Nobody here yet. Add a character to start the scene.</p>
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
              </span>
            </div>
            <IconButton
              size="sm"
              icon="trash"
              label={`Remove ${a.personality.name}`}
              onClick={() => void session.leave(a.id)}
            />
          </li>
        ))}
      </ul>
      <Button icon="plus" onClick={openNewCharacter}>
        Add character
      </Button>
    </div>
  );
}

export const castPanelModule: AppModule = {
  id: 'cast-panel',
  register: (host) =>
    host.panels.register({ id: 'cast', title: 'Cast', slot: 'side', component: CastPanel }),
};
