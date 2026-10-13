import { useState } from 'react';
import type { Actor, SavedSetup } from '@virtuocity/core';
import { startSavedSetup, startSession } from '@virtuocity/core';
import { Modal } from '@virtuocity/ui';
import { setupNames, useLibrary, useLibraryItems } from './library';
import type { PanelProps } from './types';
import { runSafely } from './LibraryActors';
import { isSessionType } from './sessionType';
import { StartFooter, useSessionName } from './SessionName';
import { useSwitcher } from './switcher';

/** Starting without a session type: just you, adding actors yourself. */
const EMPTY = '';

function Choice({
  id,
  name,
  description,
  selected,
  onSelect,
}: {
  id: string;
  name: string;
  description: string;
  selected: boolean;
  onSelect: (id: string) => void;
}) {
  return (
    <label className="blueprint" data-selected={selected}>
      <input type="radio" name="session-type" checked={selected} onChange={() => onSelect(id)} />
      <span className="blueprint__text">
        <strong>{name}</strong>
        <span className="muted">{description}</span>
      </span>
    </label>
  );
}

/** The session types in the library, the casts saved there, and starting empty. */
function Choices({
  types,
  setups,
  all,
  selected,
  onSelect,
}: {
  types: readonly Actor[];
  setups: readonly SavedSetup[];
  all: readonly Actor[];
  selected: string;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="blueprints" role="radiogroup" aria-label="Session type">
      {types.map((t) => (
        <Choice
          key={t.id}
          id={t.id}
          name={t.personality.name}
          description={`${t.personality.description} A guide shows what you can add.`}
          selected={selected === t.id}
          onSelect={onSelect}
        />
      ))}
      {setups.map((s) => (
        <Choice
          key={s.id}
          id={s.id}
          name={s.name}
          description={`Saved cast: ${setupNames(s, all).join(', ') || 'nobody left'}`}
          selected={selected === s.id}
          onSelect={onSelect}
        />
      ))}
      <Choice
        id={EMPTY}
        name="Empty"
        description="Just you. Add actors yourself."
        selected={selected === EMPTY}
        onSelect={onSelect}
      />
    </div>
  );
}

/**
 * Starts a new, named session; the one that was open stays in the session
 * list. A session type joins the new session and brings its layout and a
 * guide, but no other actors; a saved cast brings its actors from the library.
 */
export function NewSessionDialog({
  host,
  open,
  onClose,
}: PanelProps & { open: boolean; onClose: () => void }) {
  const library = useLibrary();
  const { actors, setups } = useLibraryItems();
  const all = actors.map((i) => i.actor);
  const types = all.filter((a) => isSessionType(a, host.skills.list()));
  const [picked, setSelected] = useState<string>();
  const selected = picked ?? types[0]?.id ?? EMPTY;
  const type = types.find((t) => t.id === selected);
  const saved = setups.find((s) => s.id === selected);
  const switcher = useSwitcher();
  const { name, ok, field } = useSessionName();

  const start = () => {
    if (!ok) return;
    onClose();
    runSafely(() =>
      switcher.startNew(name, async (session) => {
        if (type) await startSession(session, [type]);
        else if (saved) await startSavedSetup(session, saved, await library.actors());
      }),
    );
  };
  const footer = <StartFooter ok={ok} onStart={start} onClose={onClose} />;

  return (
    <Modal open={open} title="New session" onClose={onClose} footer={footer}>
      <div className="stack">
        {field}
        <Choices
          types={types}
          setups={setups}
          all={all}
          selected={selected}
          onSelect={setSelected}
        />
      </div>
    </Modal>
  );
}
