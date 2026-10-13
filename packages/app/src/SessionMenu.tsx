import { useState } from 'react';
import type { AssetStore, SessionRuntime } from '@virtuocity/core';
import { exportBundle, importBundle, withActorsWritten } from '@virtuocity/core';
import { IconButton } from '@virtuocity/ui';
import { useAppActions } from './actions';
import { openTextFile, saveTextFile } from './files';
import { SessionNameDialog } from './SessionName';
import { useSwitcher } from './switcher';

interface SessionMenuProps {
  readonly session: SessionRuntime;
  readonly assets: AssetStore;
}

const fileName = () => `virtuocity-${new Date().toISOString().slice(0, 10)}.json`;

/** Save the session to a file, load one from a file as a new session, or start one. Sessions autosave. */
export function SessionMenu({ session, assets }: SessionMenuProps) {
  const { openNewSession } = useAppActions();
  const switcher = useSwitcher();
  /** A session read from a file, waiting for its name. */
  const [loaded, setLoaded] = useState<unknown>(undefined);
  const run = (action: () => Promise<void>) =>
    void action().catch((error: unknown) => alert(`Something went wrong: ${String(error)}`));

  const exportFile = () =>
    run(async () =>
      saveTextFile(
        fileName(),
        await exportBundle(withActorsWritten(session.save(), session.lookup), assets),
      ),
    );

  const importFile = () =>
    run(async () => {
      const text = await openTextFile();
      if (text !== undefined) setLoaded(await importBundle(text, assets));
    });

  return (
    <>
      <IconButton icon="download" label="Save this session to a file" onClick={exportFile} />
      <IconButton icon="upload" label="Load a session from a file" onClick={importFile} />
      <IconButton icon="restart" label="New session" onClick={openNewSession} />
      {loaded !== undefined && (
        <SessionNameDialog
          title="Load a session"
          note="The session from the file becomes a new session in your list."
          onStart={(name) => run(() => switcher.startFrom(name, loaded))}
          onClose={() => setLoaded(undefined)}
        />
      )}
    </>
  );
}
