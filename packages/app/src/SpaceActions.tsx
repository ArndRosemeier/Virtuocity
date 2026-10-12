import { useState } from 'react';
import { spaceContract } from '@virtuocity/contract-space';
import type { Actor, SessionRuntime } from '@virtuocity/core';
import { provides } from '@virtuocity/core';
import { IconButton } from '@virtuocity/ui';
import { runSafely } from './LibraryActors';

/**
 * Retry and Delete for what a space shows, for spaces whose skill offers them
 * (`redo`, `discard`), e.g. an illustrator's picture.
 */
export function SpaceActions({ session, actor }: { session: SessionRuntime; actor: Actor }) {
  const [busy, setBusy] = useState(false);
  const implementation = session.implementationFor(actor.id, spaceContract);
  if (!implementation) return null;
  const name = actor.personality.name;
  const run = (action: 'redo' | 'discard') =>
    runSafely(async () => {
      setBusy(true);
      try {
        await session.invoke(actor.id, spaceContract, action, {});
      } finally {
        setBusy(false);
      }
    });
  return (
    <>
      {provides(implementation, 'redo') && (
        <IconButton
          size="sm"
          icon="restart"
          label={`Retry: make what ${name}'s space shows again`}
          disabled={busy}
          onClick={() => run('redo')}
        />
      )}
      {provides(implementation, 'discard') && (
        <IconButton
          size="sm"
          icon="trash"
          label={`Delete what ${name}'s space shows`}
          disabled={busy}
          onClick={() => run('discard')}
        />
      )}
    </>
  );
}
