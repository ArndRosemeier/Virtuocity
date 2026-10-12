import { useCallback, useEffect, useState } from 'react';
import { spaceContract } from '@virtuocity/contract-space';
import type { Actor, OutputPart, SessionRuntime } from '@virtuocity/core';
import { provides } from '@virtuocity/core';
import { Avatar, Button, IconButton, TextArea } from '@virtuocity/ui';
import { closeSpace, spaceElementId, useOpenSpaces } from './openSpaces';
import type { AppModule, PanelProps } from './types';
import type { Shown } from './useParts';
import { useParts } from './useParts';

const textOnly = (parts: readonly OutputPart[]) => parts.every((p) => p.kind === 'text');
const asText = (parts: readonly OutputPart[]) => parts.map((p) => String(p.data)).join('\n\n');

/** Edits a space that holds text (or nothing yet) as plain text. */
function Editor({
  name,
  parts,
  onSave,
}: {
  name: string;
  parts: readonly OutputPart[];
  onSave: (parts: OutputPart[]) => void;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  if (draft === null) {
    return (
      <Button size="sm" variant="ghost" icon="edit" onClick={() => setDraft(asText(parts))}>
        Edit
      </Button>
    );
  }
  const save = () => {
    onSave(draft.trim() ? [{ kind: 'text', data: draft.trim() }] : []);
    setDraft(null);
  };
  return (
    <div className="stack">
      <TextArea
        aria-label={`${name}'s space`}
        rows={8}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
      />
      <div className="row">
        <Button size="sm" onClick={save}>
          Save
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setDraft(null)}>
          Cancel
        </Button>
      </div>
    </div>
  );
}

/** Leaves full screen on Escape. */
function useEscape(active: boolean, onEscape: () => void): void {
  useEffect(() => {
    if (!active) return undefined;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onEscape();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [active, onEscape]);
}

/** What the space holds, rendered like any output and stretched to the area it gets. */
function Content({ host, shown }: Pick<PanelProps, 'host'> & { shown: Shown | undefined }) {
  if (!shown) return null;
  if ('error' in shown) return <p className="job__error">{shown.error}</p>;
  if (shown.parts.length === 0) return <p className="muted">Nothing here yet.</p>;
  return (
    <div className="space__content">
      {shown.parts.map((part, i) => (
        <div key={i}>{host.renderers.render(part)}</div>
      ))}
    </div>
  );
}

/** A space's name, with buttons to maximize it and, for on-demand spaces, to close it. */
function SpaceHeader({
  name,
  maximized,
  onToggle,
  onClose,
}: {
  name: string;
  maximized: boolean;
  onToggle: () => void;
  onClose: (() => void) | undefined;
}) {
  return (
    <header className="space__header">
      <Avatar name={name} />
      <strong>{name}</strong>
      <IconButton
        size="sm"
        icon={maximized ? 'minimize' : 'maximize'}
        label={maximized ? `Restore ${name}'s space` : `Maximize ${name}'s space`}
        onClick={onToggle}
      />
      {onClose && (
        <IconButton size="sm" icon="close" label={`Close ${name}'s space`} onClick={onClose} />
      )}
    </header>
  );
}

/** One actor's space: whatever its skill shows there. It can be maximized to full screen. */
function Space({ actor, host, session, open }: PanelProps & { actor: Actor; open: boolean }) {
  const shown = useParts(
    session,
    () => session.invoke(actor.id, spaceContract, 'fill', {}),
    actor.id,
  );
  const [maximized, setMaximized] = useState(false);
  const restore = useCallback(() => setMaximized(false), []);
  useEscape(maximized, restore);
  const implementation = session.implementationFor(actor.id, spaceContract);
  const name = actor.personality.name;
  const editable = implementation !== undefined && provides(implementation, 'edit');
  const edit = (parts: OutputPart[]) =>
    void session.invoke(actor.id, spaceContract, 'edit', { parts });
  const onDemand = shown !== undefined && 'parts' in shown && shown.onDemand === true;
  if (onDemand && !open) return null;
  return (
    <section className="space" id={spaceElementId(actor.id)} data-maximized={maximized}>
      <SpaceHeader
        name={name}
        maximized={maximized}
        onToggle={() => setMaximized(!maximized)}
        onClose={onDemand ? () => closeSpace(actor.id) : undefined}
      />
      <Content host={host} shown={shown} />
      {editable && shown && 'parts' in shown && textOnly(shown.parts) && (
        <Editor name={name} parts={shown.parts} onSave={edit} />
      )}
    </section>
  );
}

/** Actors whose skills give them a space on screen. */
export function actorsWithSpaces(session: SessionRuntime): Actor[] {
  return session.actors.filter((a) => session.implementationFor(a.id, spaceContract));
}

/** The spaces of every actor that has one; actors without the space contract get none. */
function SpacesPanel({ host, session }: PanelProps) {
  const actors = actorsWithSpaces(session);
  const open = useOpenSpaces();
  if (actors.length === 0) {
    return (
      <p className="muted">
        Actors with a space show up here, like an illustrator with its latest picture, or a canvas
        you write on.
      </p>
    );
  }
  return (
    <div className="spaces">
      {actors.map((actor) => (
        <Space
          key={actor.id}
          actor={actor}
          host={host}
          session={session}
          open={open.has(actor.id)}
        />
      ))}
    </div>
  );
}

export const spacesPanelModule: AppModule = {
  id: 'spaces-panel',
  register: (host) =>
    host.panels.register({ id: 'spaces', title: 'Spaces', slot: 'left', component: SpacesPanel }),
};
