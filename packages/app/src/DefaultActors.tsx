import { useState } from 'react';
import { Button, Modal, Section } from '@virtuocity/ui';
import { useLibrary } from './library';
import type { Restored } from './seed';
import { restoreStarters } from './seed';
import type { AppHost } from './types';

const fail = (error: unknown) => alert(`Something went wrong: ${String(error)}`);

const summary = ({ updated, added }: Restored) =>
  [
    updated.length > 0 && `Updated: ${updated.join(', ')}.`,
    added.length > 0 && `Added back: ${added.join(', ')}.`,
  ]
    .filter(Boolean)
    .join(' ') || 'Nothing to update.';

/** Sets the ready-made actors back to how this version ships them, after a warning. */
export function DefaultActors({ host }: { host: AppHost }) {
  const library = useLibrary();
  const [asking, setAsking] = useState(false);
  const [done, setDone] = useState<string>();

  const update = () => {
    setAsking(false);
    void restoreStarters(library, host)
      .then((r) => setDone(summary(r)))
      .catch(fail);
  };

  return (
    <Section title="Ready-made actors">
      <p className="settings-note">
        Brings the ready-made session types and actors (Roleplay, Narrator, Director, …) up to this
        version, e.g. to get new wizard questions. Your other actors stay as they are.
      </p>
      <div className="segmented">
        <Button icon="restart" onClick={() => setAsking(true)}>
          Update default actors…
        </Button>
      </div>
      {done && <p className="settings-note">{done}</p>}
      {asking && (
        <Modal
          open
          size="sm"
          title="Update default actors?"
          onClose={() => setAsking(false)}
          footer={
            <>
              <Button variant="ghost" onClick={() => setAsking(false)}>
                Cancel
              </Button>
              <Button variant="primary" icon="restart" onClick={update}>
                Update
              </Button>
            </>
          }
        >
          <p>
            Every ready-made actor is set back to how this version ships it. Changes you made to
            them are lost, ones you deleted come back, and since an actor is the same everywhere,
            sessions using them change too. Copies under other names are not touched.
          </p>
        </Modal>
      )}
    </Section>
  );
}
