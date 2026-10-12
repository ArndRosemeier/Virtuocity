import type { AssetStore, SessionRuntime } from '@virtuocity/core';
import { exportBundle, importBundle } from '@virtuocity/core';
import { IconButton } from '@virtuocity/ui';
import { useAppActions } from './actions';
import { openTextFile, saveTextFile } from './files';
import { ensureCast } from './useSession';

interface SessionMenuProps {
  readonly session: SessionRuntime;
  readonly assets: AssetStore;
}

const fileName = () => `virtuocity-${new Date().toISOString().slice(0, 10)}.json`;

/** Save all to a file, load from a file, or start over. The session itself autosaves. */
export function SessionMenu({ session, assets }: SessionMenuProps) {
  const { openNewSession } = useAppActions();
  const run = (action: () => Promise<void>) =>
    void action().catch((error: unknown) => alert(`Something went wrong: ${String(error)}`));

  const exportFile = () =>
    run(async () => saveTextFile(fileName(), await exportBundle(session.save(), assets)));

  const importFile = () =>
    run(async () => {
      const text = await openTextFile();
      if (text === undefined) return;
      await session.load(await importBundle(text, assets));
      await ensureCast(session);
    });

  return (
    <>
      <IconButton icon="download" label="Save all to a file" onClick={exportFile} />
      <IconButton icon="upload" label="Load from a file" onClick={importFile} />
      <IconButton icon="restart" label="New session" onClick={openNewSession} />
    </>
  );
}
