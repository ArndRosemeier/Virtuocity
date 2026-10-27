import type { Actor } from '@virtuocity/core';
import {
  CAST,
  castDoc,
  isSessionType,
  pauseActor,
  pausedIds,
  readModelChoice,
} from '@virtuocity/core';
import { Avatar, Button, IconButton, Pill } from '@virtuocity/ui';
import { useAppActions } from './actions';
import { useActorTips } from './actorTips';
import { runSafely } from './LibraryActors';
import { SessionTypeField } from './SessionTypeField';
import { SetupGuide } from './SetupGuide';
import { StoryViewPicker } from './StoryViewPicker';
import { STORY_VIEW } from './storyView';
import type { AppModule, PanelProps } from './types';

interface CastRowProps {
  readonly actor: Actor;
  readonly speaking: boolean;
  readonly onLeave: () => void;
  /** Whether the actor is paused in this session; undefined for actors directors never pick. */
  readonly paused?: boolean;
  readonly onPause?: () => void;
}

/** Pauses a cast actor in this session (directors skip it) or lets it go on. */
function PauseButton({
  name,
  paused,
  onPause,
}: {
  name: string;
  paused: boolean;
  onPause: () => void;
}) {
  return (
    <IconButton
      size="sm"
      icon={paused ? 'play' : 'pause'}
      label={
        paused
          ? `Let ${name} go on: directors can pick ${name} again`
          : `Pause ${name} in this session: directors skip ${name} until you go on`
      }
      onClick={onPause}
    />
  );
}

/** One actor in the scene, with edit and remove. Editing changes the actor in the library too. */
function CastRow({ actor: a, speaking, onLeave, paused, onPause }: CastRowProps) {
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
              {readModelChoice(model)?.model}
            </Pill>
          ))}
          {speaking && <Pill tone="accent">writing…</Pill>}
          {paused && <Pill>paused</Pill>}
        </span>
      </div>
      {paused !== undefined && onPause && (
        <PauseButton name={a.personality.name} paused={paused} onPause={onPause} />
      )}
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
 * Who is in the session: the cast (actors with one of the session type's cast
 * skills) and, apart from it, support actors, who can all join and leave at
 * any time. Below them the two every session has exactly one of: its type
 * (kept for good) and its view.
 */
function CastPanel({ host, session }: PanelProps) {
  const { openAddActor } = useAppActions();
  // Leaving keeps what the actor did; going back to before it left brings it back.
  const remove = (a: Actor) => runSafely(() => session.leave(a.id));
  const fixed = (a: Actor) => isSessionType(a, host.skills.list());
  const row = (a: Actor) => (
    <CastRow key={a.id} actor={a} speaking={session.speaking === a.id} onLeave={() => remove(a)} />
  );
  const paused = pausedIds(session.workspace.read(CAST, castDoc));
  const castRow = (a: Actor) => (
    <CastRow
      key={a.id}
      actor={a}
      speaking={session.speaking === a.id}
      onLeave={() => remove(a)}
      paused={paused.has(a.id)}
      onPause={() => runSafely(() => pauseActor(session, a.id, !paused.has(a.id)))}
    />
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
      <ul className="cast__list">{cast.map(castRow)}</ul>
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
    </div>
  );
}

export const castPanelModule: AppModule = {
  id: 'cast-panel',
  register: (host) =>
    host.panels.register({ id: 'cast', title: 'Cast', slot: 'side', component: CastPanel }),
};
