import { useEffect, useRef, useState } from 'react';
import type { Actor } from '@virtuocity/core';
import { freeName, isSessionType, startSession } from '@virtuocity/core';
import { Modal } from '@virtuocity/ui';
import { useLibraryItems } from './library';
import type { PanelProps } from './types';
import { runSafely } from './LibraryActors';
import { StartFooter, useSessionName } from './SessionName';
import { useSwitcher } from './switcher';

function Choice({
  type,
  selected,
  onSelect,
}: {
  type: Actor;
  selected: boolean;
  onSelect: (id: string) => void;
}) {
  return (
    <label className="blueprint" data-selected={selected}>
      <input
        type="radio"
        name="session-type"
        checked={selected}
        onChange={() => onSelect(type.id)}
      />
      <span className="blueprint__text">
        <strong>{type.personality.name}</strong>
        <span className="muted">{type.personality.description}</span>
      </span>
    </label>
  );
}

/**
 * The session's name, filled with the picked type's name (made unique, e.g.
 * "Roleplay 2") while the field is empty or still holds such a filled-in name.
 * A name the person typed is never replaced.
 */
function useNameFromType(type: Actor | undefined) {
  const session = useSessionName();
  const { typed, setName, taken } = session;
  const filled = useRef('');
  const current = useRef(typed);
  current.current = typed;
  const suggestion = type && freeName(type.personality.name, taken);
  // Runs when the suggestion changes (another type, or the session list loaded), never on typing.
  useEffect(() => {
    const now = current.current;
    if (!suggestion || (now.trim() !== '' && now !== filled.current)) return;
    filled.current = suggestion;
    setName(suggestion);
  }, [suggestion, setName]);
  return session;
}

/**
 * Starts a new, named session of one of the library's session types; the one
 * that was open stays in the session list. The type joins the new session and
 * decides its cast contracts, panels and guide; you add the other actors.
 */
export function NewSessionDialog({
  host,
  open,
  onClose,
}: PanelProps & { open: boolean; onClose: () => void }) {
  const { actors } = useLibraryItems();
  const types = actors.map((i) => i.actor).filter((a) => isSessionType(a, host.skills.list()));
  const [picked, setPicked] = useState<string>();
  const type = types.find((t) => t.id === picked) ?? types[0];
  const switcher = useSwitcher();
  const { name, ok, field } = useNameFromType(type);

  const start = () => {
    if (!ok || !type) return;
    onClose();
    runSafely(() => switcher.startNew(name, (session) => startSession(session, [type])));
  };
  const footer = <StartFooter ok={ok && type !== undefined} onStart={start} onClose={onClose} />;

  return (
    <Modal open={open} title="New session" onClose={onClose} footer={footer}>
      <div className="stack">
        {field}
        {types.length === 0 ? (
          <p className="muted">
            Every session has a session type, and your library has none. Make one in the Library: a
            new actor with the Session type skill.
          </p>
        ) : (
          <div className="blueprints" role="radiogroup" aria-label="Session type">
            {types.map((t) => (
              <Choice key={t.id} type={t} selected={t.id === type?.id} onSelect={setPicked} />
            ))}
          </div>
        )}
      </div>
    </Modal>
  );
}
