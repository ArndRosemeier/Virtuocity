import { useCallback, useEffect, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { spaceContract } from '@virtuocity/contract-space';
import type { Actor, OutputPart, SessionRuntime } from '@virtuocity/core';
import { provides } from '@virtuocity/core';
import { Avatar, Button, IconButton, TextArea } from '@virtuocity/ui';
import { DragHandle } from './DragHandle';
import { SpaceActions } from './SpaceActions';
import { GalleryView, SpaceStepper, browsable } from './SpaceBrowse';
import { useSetting } from './settings';
import { heightCss, movedHeight, spaceHeightSetting } from './spaceHeight';
import { closeSpace, isShown, openSpace, spaceElementId, useOpenSpaces } from './openSpaces';
import type { AppModule, PanelProps } from './types';
import type { Toggled } from './openSpaces';
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

/**
 * What the space holds, rendered like any output and stretched to the area it
 * gets; several items show as a gallery when it has the whole screen (`gallery`).
 */
function Content({
  host,
  shown,
  gallery,
  ...browsing
}: PanelProps & { shown: Shown | undefined; gallery: boolean; actor: Actor }) {
  if (!shown) return null;
  if ('error' in shown) return <p className="job__error">{shown.error}</p>;
  const steps = gallery ? browsable(shown) : undefined;
  if (steps) return <GalleryView host={host} {...steps} {...browsing} />;
  if (shown.parts.length === 0) return <p className="muted">Nothing here yet.</p>;
  return (
    <div className="space__content">
      {shown.parts.map((part, i) => (
        <div key={i}>{host.renderers.render(part)}</div>
      ))}
    </div>
  );
}

/** A space's name, its own actions, and buttons to maximize and to close it. */
function SpaceHeader({
  name,
  maximized,
  onToggle,
  onClose,
  children,
}: {
  name: string;
  maximized: boolean;
  onToggle: () => void;
  onClose: () => void;
  children?: ReactNode;
}) {
  return (
    <header className="space__header">
      <Avatar name={name} />
      <strong>{name}</strong>
      {children}
      <IconButton
        size="sm"
        icon={maximized ? 'minimize' : 'maximize'}
        label={maximized ? `Restore ${name}'s space` : `Maximize ${name}'s space`}
        onClick={onToggle}
      />
      <IconButton size="sm" icon="close" label={`Close ${name}'s space`} onClick={onClose} />
    </header>
  );
}

/** Whether a space waits to be opened, and whether it shows anything. */
function shownState(
  shown: Shown<{ parts: readonly OutputPart[]; onDemand?: boolean | undefined }> | undefined,
) {
  const parts = shown && 'parts' in shown ? shown : undefined;
  return { onDemand: parts?.onDemand === true, hasContent: (parts?.parts.length ?? 0) > 0 };
}

/** The height a space was given, unless it is maximized. */
function useSpaceHeight(actorId: string, maximized: boolean): CSSProperties | undefined {
  const [stored] = useSetting(spaceHeightSetting(actorId));
  const height = heightCss(stored);
  return height && !maximized ? { height } : undefined;
}

/** The bottom edge of a space; its height is remembered in this browser, per actor. */
function SpaceResize({ actorId, name }: { actorId: string; name: string }) {
  const [, setHeight] = useSetting(spaceHeightSetting(actorId));
  return (
    <DragHandle
      axis="y"
      className="space-resize"
      label={`Resize ${name}'s space`}
      size={(handle) => handle.previousElementSibling?.getBoundingClientRect().height ?? 0}
      onMove={(start, delta) => setHeight(String(movedHeight(start, delta, window.innerHeight)))}
      onReset={() => setHeight('')}
    />
  );
}

/** A closed space that doesn't wait for a marker: a button to show it again. */
function ClosedSpace({ actorId, name }: { actorId: string; name: string }) {
  return (
    <Button size="sm" variant="ghost" icon="maximize" onClick={() => openSpace(actorId)}>
      {`Show ${name}'s space`}
    </Button>
  );
}

/**
 * One actor's space: whatever its skill shows there. It can be maximized to
 * full screen, and closed; on-demand spaces show only once opened.
 */
function Space({ actor, host, session, toggled }: PanelProps & { actor: Actor; toggled: Toggled }) {
  const shown = useParts(
    session,
    () => session.invoke(actor.id, spaceContract, 'fill', {}),
    actor.id,
  );
  const [maximized, setMaximized] = useState(false);
  const style = useSpaceHeight(actor.id, maximized);
  const restore = useCallback(() => setMaximized(false), []);
  useEscape(maximized, restore);
  const implementation = session.implementationFor(actor.id, spaceContract);
  const name = actor.personality.name;
  const editable = implementation !== undefined && provides(implementation, 'edit');
  const edit = (parts: OutputPart[]) =>
    void session.invoke(actor.id, spaceContract, 'edit', { parts });
  const { onDemand, hasContent } = shownState(shown);
  if (!isShown(toggled, actor.id, onDemand)) {
    return onDemand ? null : <ClosedSpace actorId={actor.id} name={name} />;
  }
  return (
    <>
      <section
        className="space"
        id={spaceElementId(actor.id)}
        data-maximized={maximized}
        style={style}
      >
        <SpaceHeader
          name={name}
          maximized={maximized}
          onToggle={() => setMaximized(!maximized)}
          onClose={() => closeSpace(actor.id)}
        >
          <SpaceStepper session={session} actor={actor} shown={shown} />
          {hasContent && <SpaceActions session={session} actor={actor} />}
        </SpaceHeader>
        <Content host={host} shown={shown} gallery={maximized} session={session} actor={actor} />
        {editable && shown && 'parts' in shown && textOnly(shown.parts) && (
          <Editor name={name} parts={shown.parts} onSave={edit} />
        )}
      </section>
      {!maximized && <SpaceResize actorId={actor.id} name={name} />}
    </>
  );
}

/** Actors whose skills give them a space on screen. */
export function actorsWithSpaces(session: SessionRuntime): Actor[] {
  return session.actors.filter((a) => session.implementationFor(a.id, spaceContract));
}

/** The spaces of every actor that has one; actors without the space contract get none. */
function SpacesPanel({ host, session }: PanelProps) {
  const actors = actorsWithSpaces(session);
  const toggled = useOpenSpaces();
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
        <Space key={actor.id} actor={actor} host={host} session={session} toggled={toggled} />
      ))}
    </div>
  );
}

export const spacesPanelModule: AppModule = {
  id: 'spaces-panel',
  register: (host) =>
    host.panels.register({ id: 'spaces', title: 'Spaces', slot: 'left', component: SpacesPanel }),
};
