import { useState } from 'react';
import { Button, Modal } from '@virtuocity/ui';
import { RELEASES, currentRelease, formatVersion, unseen } from './changelog';
import { useSetting } from './settings';
import type { Setting } from './settings';

const LAST_SEEN: Setting = { key: 'virtuocity.lastSeenBuild', fallback: '0' };

/** The version number; opens the version history and marks new builds until seen. */
export function WhatsNew() {
  const [open, setOpen] = useState(false);
  const [lastSeen, setLastSeen] = useSetting(LAST_SEEN);
  const latest = currentRelease();
  const fresh = unseen(Number(lastSeen) || 0).map((r) => r.build);
  // Remembered when opened, so new entries stay highlighted while the history is shown.
  const [highlight, setHighlight] = useState<readonly number[]>([]);
  const show = () => {
    setHighlight(fresh);
    setOpen(true);
    setLastSeen(String(latest.build));
  };
  return (
    <>
      <Button variant="ghost" className="whats-new" onClick={show} data-fresh={fresh.length > 0}>
        v{formatVersion(latest.build)}
        <span className="whats-new__label">What's new</span>
      </Button>
      <Modal open={open} title="What's new" onClose={() => setOpen(false)} doneLabel="Done">
        <ol className="releases">
          {RELEASES.map((r) => (
            <li key={r.build} className="release" data-fresh={highlight.includes(r.build)}>
              <h3 className="release__title">
                Version {formatVersion(r.build)}
                <time dateTime={r.date}>{r.date}</time>
              </h3>
              <ul>
                {r.changes.map((change) => (
                  <li key={change}>{change}</li>
                ))}
              </ul>
            </li>
          ))}
        </ol>
      </Modal>
    </>
  );
}
