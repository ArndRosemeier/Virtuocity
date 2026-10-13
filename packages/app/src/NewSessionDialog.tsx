import { useState } from 'react';
import type { Actor } from '@virtuocity/core';
import { isSessionType } from '@virtuocity/core';
import { Modal } from '@virtuocity/ui';
import { useLibraryItems } from './library';
import type { PanelProps } from './types';
import { runSafely } from './LibraryActors';
import { StartFooter, useSessionName } from './SessionName';
import { SetupWizard } from './SetupWizard';
import { useSwitcher } from './switcher';
import { startPicked } from './wizard';

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
 * decides its cast contracts, panels and guide. With "Guide me" on, the setup
 * wizard asks for the type's roles first; otherwise you add the actors later.
 */
export function NewSessionDialog({
  host,
  open,
  onClose,
}: PanelProps & { open: boolean; onClose: () => void }) {
  const { actors } = useLibraryItems();
  const types = actors.map((i) => i.actor).filter((a) => isSessionType(a, host.skills.list()));
  const [picked, setPicked] = useState<string>();
  const [guided, setGuided] = useState(true);
  const [asking, setAsking] = useState(false);
  const type = types.find((t) => t.id === picked) ?? types[0];
  const switcher = useSwitcher();
  const { name, ok, field } = useSessionName('', undefined, type?.personality.name);

  const begin = (cast: readonly Actor[]) => {
    if (!ok || !type) return;
    onClose();
    runSafely(() => startPicked(switcher, name, type, cast));
  };
  if (asking && type) {
    const back = () => setAsking(false);
    return <SetupWizard host={host} type={type} onBack={back} onClose={onClose} onStart={begin} />;
  }
  const next = () => (guided ? ok && setAsking(true) : begin([]));
  const label = guided ? 'Next' : 'Start';
  const footer = (
    <StartFooter ok={ok && type !== undefined} onStart={next} onClose={onClose} label={label} />
  );

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
        <label className="settings__check">
          <input type="checkbox" checked={guided} onChange={(e) => setGuided(e.target.checked)} />
          Guide me: ask who takes part, step by step
        </label>
      </div>
    </Modal>
  );
}
