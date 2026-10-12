import { useState } from 'react';
import type { SavedSetup } from '@virtuocity/core';
import { startBlueprint, startSavedSetup } from '@virtuocity/core';
import { Modal } from '@virtuocity/ui';
import { setupNames, useLibrary, useLibraryItems } from './library';
import type { PanelProps } from './types';
import { runSafely } from './LibraryActors';
import { StartFooter, useSessionName } from './SessionName';
import { useSwitcher } from './switcher';

/** Starting without a setup: just you, adding actors yourself. */
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
      <input type="radio" name="blueprint" checked={selected} onChange={() => onSelect(id)} />
      <span className="blueprint__text">
        <strong>{name}</strong>
        <span className="muted">{description}</span>
      </span>
    </label>
  );
}

/** Every installed setup, the casts saved in the library, and starting empty. */
function Choices({
  host,
  setups,
  selected,
  onSelect,
}: Pick<PanelProps, 'host'> & {
  setups: readonly SavedSetup[];
  selected: string;
  onSelect: (id: string) => void;
}) {
  const { actors } = useLibraryItems();
  const all = actors.map((i) => i.actor);
  return (
    <div className="blueprints" role="radiogroup" aria-label="Setup">
      {host.blueprints.list().map((b) => (
        <Choice
          key={b.id}
          id={b.id}
          name={b.name}
          description={`${b.description} A guide shows what you can add.`}
          selected={selected === b.id}
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
 * list. A setup brings its layout and a guide but no actors; a saved cast
 * brings its actors from the library.
 */
export function BlueprintDialog({
  host,
  open,
  onClose,
}: PanelProps & { open: boolean; onClose: () => void }) {
  const library = useLibrary();
  const [selected, setSelected] = useState(host.blueprints.list()[0]?.id ?? EMPTY);
  const blueprint = host.blueprints.find(selected);
  const { setups } = useLibraryItems();
  const saved = setups.find((s) => s.id === selected);
  const switcher = useSwitcher();
  const { name, ok, field } = useSessionName();

  const start = () => {
    if (!ok) return;
    onClose();
    runSafely(() =>
      switcher.startNew(name, async (session) => {
        if (blueprint) await startBlueprint(session, blueprint);
        else if (saved)
          await startSavedSetup(session, saved, await library.actors(), host.blueprints);
      }),
    );
  };
  const footer = <StartFooter ok={ok} onStart={start} onClose={onClose} />;

  return (
    <Modal open={open} title="New session" onClose={onClose} footer={footer}>
      <div className="stack">
        {field}
        <Choices host={host} setups={setups} selected={selected} onSelect={setSelected} />
      </div>
    </Modal>
  );
}
