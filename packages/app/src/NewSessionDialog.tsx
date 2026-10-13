import { useState } from 'react';
import type { Actor } from '@virtuocity/core';
import { isSessionType, startSession } from '@virtuocity/core';
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
  const { name, ok, field } = useSessionName();

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
