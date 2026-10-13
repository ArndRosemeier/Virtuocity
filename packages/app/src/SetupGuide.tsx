import { SETUP, hideGuide, setupDoc } from '@virtuocity/core';
import { IconButton } from '@virtuocity/ui';
import { isLibraryActor } from './library';
import type { GuideLine } from './sessionType';
import { guideLines } from './sessionType';
import type { Setting } from './settings';
import { useSetting } from './settings';
import type { PanelProps } from './types';
import { useSessionType } from './useSessionType';

/** Whether sessions with a session type show its guide. */
export const SHOW_GUIDE: Setting = { key: 'virtuocity.guide', fallback: 'on' };

function Line({ line }: { line: GuideLine }) {
  const { role, actor, available } = line;
  return (
    <li className="guide__line" data-done={actor !== undefined}>
      <span className="guide__mark" aria-hidden>
        {actor ? '✓' : '○'}
      </span>
      <span>
        <strong>{role.label}</strong>
        {actor && <span className="muted"> · {actor.personality.name}</span>}
        {role.hint !== '' && <span className="guide__hint muted">{role.hint}</span>}
        {!available && <span className="guide__hint muted">No installed skill can do this.</span>}
      </span>
    </li>
  );
}

/**
 * What a session of this type can use, ticked off as matching actors join.
 * It only explains: you add actors yourself, anything not listed is fine too.
 */
export function SetupGuide({ host, session }: PanelProps) {
  const [show] = useSetting(SHOW_GUIDE);
  const type = useSessionType();
  if (show !== 'on' || type.kind !== 'described') return null;
  if (session.workspace.read(SETUP, setupDoc).guideHidden) return null;
  const name = type.actor.personality.name;
  const actors = session.actors.filter((a) => isLibraryActor(a) && a.id !== type.actor.id);
  const lines = guideLines(type.description, host.skills.list(), actors);
  const usual = lines.filter((l) => l.role.importance !== 'optional');
  const options = lines.filter((l) => l.role.importance === 'optional');
  if (lines.length === 0) return null;
  return (
    <section className="guide" aria-label={`${name} guide`}>
      <header className="guide__header">
        <strong>{name}</strong>
        <IconButton
          size="sm"
          icon="close"
          label="Hide the guide for this session"
          onClick={() => void hideGuide(session)}
        />
      </header>
      {usual.length > 0 && <h4 className="guide__group">Usually</h4>}
      <ul className="guide__list">
        {usual.map((l, i) => (
          <Line key={i} line={l} />
        ))}
      </ul>
      {options.length > 0 && <h4 className="guide__group">Options</h4>}
      <ul className="guide__list">
        {options.map((l, i) => (
          <Line key={i} line={l} />
        ))}
      </ul>
      <p className="muted guide__foot">
        Add actors with Add actor. Nothing here is required. Turn the guide off in Settings ›
        Appearance.
      </p>
    </section>
  );
}
