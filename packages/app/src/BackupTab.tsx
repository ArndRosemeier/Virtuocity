import { useState } from 'react';
import { Button, Modal, Section } from '@virtuocity/ui';
import { loadAll, readBackup, saveAll } from './backup';
import type { AppState, Backup } from './backup';
import { openFile, saveFile } from './files';
import { readAllSettings, replaceAllSettings } from './settings';
import { indexedDbStore } from './storage';

const ZIP_FILE = { description: 'Virtuocity backup', accept: { 'application/zip': ['.zip'] } };

function appState(): AppState {
  return {
    sessions: indexedDbStore('sessions'),
    library: indexedDbStore('library'),
    assets: indexedDbStore('assets'),
    settings: { read: readAllSettings, replace: replaceAllSettings },
  };
}

const fileName = () => `virtuocity-backup-${new Date().toISOString().slice(0, 10)}.zip`;

const fail = (error: unknown) => alert(`Something went wrong: ${String(error)}`);

/** Saves everything to one zip file, or replaces everything with one. */
export function BackupTab() {
  const [pending, setPending] = useState<Backup | null>(null);

  const save = () =>
    void saveAll(appState())
      .then((zip) => saveFile(fileName(), new Blob([zip as Uint8Array<ArrayBuffer>]), ZIP_FILE))
      .catch(fail);

  const pick = () =>
    void openFile('.zip,application/zip')
      .then(async (file) => {
        if (file) setPending(readBackup(new Uint8Array(await file.arrayBuffer())));
      })
      .catch(fail);

  const replace = (backup: Backup) =>
    void loadAll(appState(), backup)
      .then(() => location.reload())
      .catch(fail);

  return (
    <Section title="Everything">
      <p className="settings-note">
        One zip file with all sessions and templates, the Library, pictures and all settings. Your
        API keys are never included.
      </p>
      <div className="segmented">
        <Button icon="download" onClick={save}>
          Save all…
        </Button>
        <Button icon="upload" onClick={pick}>
          Load all…
        </Button>
      </div>
      {pending && (
        <Modal
          open
          size="sm"
          title="Replace everything?"
          onClose={() => setPending(null)}
          footer={
            <>
              <Button variant="ghost" onClick={() => setPending(null)}>
                Cancel
              </Button>
              <Button variant="primary" icon="upload" onClick={() => replace(pending)}>
                Replace everything
              </Button>
            </>
          }
        >
          <p>
            Loading replaces all sessions, the whole Library, all pictures and all settings with the
            ones in the file. Your API keys stay. Save all first if you want to keep what you have.
          </p>
        </Modal>
      )}
    </Section>
  );
}
