import type { AssetStore, SessionRuntime } from '@virtuocity/core';
import { exportBundle, importBundle } from '@virtuocity/core';
import { IconButton } from '@virtuocity/ui';
import { useAppActions } from './actions';
import { openTextFile, saveTextFile } from './files';
import type { AppHost } from './types';
import { ensureCast } from './useSession';
import { syncCast, useLibrary } from './library';
import { useResolveConflicts } from './conflicts';

interface SessionMenuProps {
  readonly host: AppHost;
  readonly session: SessionRuntime;
  readonly assets: AssetStore;
}

const fileName = () => `virtuocity-${new Date().toISOString().slice(0, 10)}.json`;

/** Save the session to a file, load one from a file, or start over. The session itself autosaves. */
export function SessionMenu({ host, session, assets }: SessionMenuProps) {
  const { openNewSession } = useAppActions();
  const library = useLibrary();
  const resolve = useResolveConflicts();
  const run = (action: () => Promise<void>) =>
    void action().catch((error: unknown) => alert(`Something went wrong: ${String(error)}`));

  const exportFile = () =>
    run(async () => saveTextFile(fileName(), await exportBundle(session.save(), assets)));

  const importFile = () =>
    run(async () => {
      const text = await openTextFile();
      if (text === undefined) return;
      await session.load(await importBundle(text, assets));
      await syncCast(library, session, resolve);
      await ensureCast(host, session);
    });

  return (
    <>
      <IconButton icon="download" label="Save this session to a file" onClick={exportFile} />
      <IconButton icon="upload" label="Load a session from a file" onClick={importFile} />
      <IconButton icon="restart" label="New session" onClick={openNewSession} />
    </>
  );
}
