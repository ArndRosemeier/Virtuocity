import { useState } from 'react';
import type { SavedSetup } from '@virtuocity/core';
import { startBlueprint, startSavedSetup } from '@virtuocity/core';
import { Button, Modal } from '@virtuocity/ui';
import { setupNames, useLibrary, useLibraryItems } from './library';
import type { PanelProps } from './types';
import { ensureCast } from './useSession';

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
 * Starts a new session, replacing the current one. A setup brings its layout
 * and a guide but no actors; a saved cast brings its actors from the library.
 */
export function BlueprintDialog({
  host,
  session,
  open,
  onClose,
}: PanelProps & { open: boolean; onClose: () => void }) {
  const library = useLibrary();
  const [selected, setSelected] = useState(host.blueprints.list()[0]?.id ?? EMPTY);
  const blueprint = host.blueprints.find(selected);
  const { setups } = useLibraryItems();
  const saved = setups.find((s) => s.id === selected);

  const start = async () => {
    await session.workspace.load([], null);
    await ensureCast(host, session);
    if (blueprint) await startBlueprint(session, blueprint);
    else if (saved) await startSavedSetup(session, saved, await library.actors(), host.blueprints);
    onClose();
  };

  const footer = (
    <>
      <Button variant="ghost" onClick={onClose}>
        Cancel
      </Button>
      <Button variant="primary" icon="sparkles" onClick={() => void start()}>
        Start
      </Button>
    </>
  );

  return (
    <Modal open={open} title="New session" onClose={onClose} footer={footer}>
      <div className="stack">
        <p className="muted">
          This replaces the current session. Save it to a file first if you want to keep it.
        </p>
        <Choices host={host} setups={setups} selected={selected} onSelect={setSelected} />
      </div>
    </Modal>
  );
}
