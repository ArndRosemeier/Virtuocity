import { createContext, useContext, useRef, useState } from 'react';
import type { ConflictChoice, NameConflict, ResolveConflicts } from '@virtuocity/core';
import { Avatar, Button, Modal } from '@virtuocity/ui';

export const ConflictsContext = createContext<ResolveConflicts | null>(null);

/** Asks the user how to settle actors whose names are already in the library. */
export function useResolveConflicts(): ResolveConflicts {
  const resolve = useContext(ConflictsContext);
  if (!resolve) throw new Error('useResolveConflicts must be used inside the app');
  return resolve;
}

type Choices = Record<string, ConflictChoice>;

function ConflictRow({
  conflict,
  choice,
  onChange,
}: {
  conflict: NameConflict;
  choice: ConflictChoice;
  onChange: (choice: ConflictChoice) => void;
}) {
  const { incoming } = conflict;
  const name = incoming.personality.name;
  return (
    <li className="cast__item">
      <Avatar name={name} />
      <div className="cast__info">
        <strong>{name}</strong>
      </div>
      <div className="segmented" role="radiogroup" aria-label={`Which ${name}`}>
        {(['keep', 'replace'] as const).map((c) => (
          <Button
            key={c}
            size="sm"
            role="radio"
            aria-checked={choice === c}
            variant={choice === c ? 'primary' : 'secondary'}
            onClick={() => onChange(c)}
          >
            {c === 'keep' ? 'Keep mine' : 'Use the loaded one'}
          </Button>
        ))}
      </div>
    </li>
  );
}

interface Pending {
  readonly conflicts: readonly NameConflict[];
  readonly done: (choices: Choices) => void;
}

/**
 * The resolver for the app and the dialog it opens. Every name is one actor, so
 * when loaded actors have names your library already uses, you pick which
 * version stays: yours, or the loaded one. The session and library then both use it.
 */
export function useConflictDialog(): [ResolveConflicts, React.ReactNode] {
  const [pending, setPending] = useState<Pending | null>(null);
  const [choices, setChoices] = useState<Choices>({});
  const resolve = useRef<ResolveConflicts>(
    (conflicts) =>
      new Promise((done) => {
        setChoices({});
        setPending({ conflicts, done });
      }),
  ).current;
  const finish = (result: Choices) => {
    pending?.done(result);
    setPending(null);
  };
  const dialog = pending && (
    <Modal
      open
      title="Actors with the same name"
      onClose={() => finish({})}
      footer={
        <Button variant="primary" onClick={() => finish(choices)}>
          Continue
        </Button>
      }
    >
      <div className="stack">
        <p className="muted">
          Your library already has actors with these names. A name is one actor, so pick which
          version to keep. It is used everywhere.
        </p>
        <ul className="cast__list">
          {pending.conflicts.map((c) => (
            <ConflictRow
              key={c.incoming.id}
              conflict={c}
              choice={choices[c.incoming.id] ?? 'keep'}
              onChange={(next) => setChoices({ ...choices, [c.incoming.id]: next })}
            />
          ))}
        </ul>
      </div>
    </Modal>
  );
  return [resolve, dialog];
}
