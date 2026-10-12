import { useCallback, useEffect, useReducer, useState } from 'react';
import { spaceContract } from '@virtuocity/contract-space';
import type { Actor, OutputPart, SessionRuntime } from '@virtuocity/core';
import { headMoved, provides, stateChanged } from '@virtuocity/core';
import { Avatar, Button, IconButton, TextArea } from '@virtuocity/ui';
import type { AppModule, PanelProps } from './types';

type Shown = { readonly parts: readonly OutputPart[] } | { readonly error: string };

/** What an actor's space shows, asked for again whenever the session's state moves. */
function useSpace(session: SessionRuntime, actorId: string): Shown | undefined {
  const [shown, setShown] = useState<Shown>();
  const [version, bump] = useReducer((n: number) => n + 1, 0);
  useEffect(() => {
    const offs = [session.bus.on(stateChanged, bump), session.bus.on(headMoved, bump)];
    return () => offs.forEach((off) => off());
  }, [session]);
  useEffect(() => {
    let live = true;
    session.invoke(actorId, spaceContract, 'fill', {}).then(
      ({ parts }) => live && setShown({ parts }),
      (error: unknown) => live && setShown({ error: String(error) }),
    );
    return () => {
      live = false;
    };
  }, [session, actorId, version]);
  return shown;
}

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

/** One actor's space: whatever its skill shows there. It can be maximized to full screen. */
function Space({ actor, host, session }: PanelProps & { actor: Actor }) {
  const shown = useSpace(session, actor.id);
  const [maximized, setMaximized] = useState(false);
  const restore = useCallback(() => setMaximized(false), []);
  useEscape(maximized, restore);
  const implementation = session.implementationFor(actor.id, spaceContract);
  const name = actor.personality.name;
  const editable = implementation !== undefined && provides(implementation, 'edit');
  const edit = (parts: OutputPart[]) =>
    void session.invoke(actor.id, spaceContract, 'edit', { parts });
  return (
    <section className="space" data-maximized={maximized}>
      <header className="space__header">
        <Avatar name={name} />
        <strong>{name}</strong>
        <IconButton
          size="sm"
          icon={maximized ? 'minimize' : 'maximize'}
          label={maximized ? `Restore ${name}'s space` : `Maximize ${name}'s space`}
          onClick={() => setMaximized(!maximized)}
        />
      </header>
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
        <Space key={actor.id} actor={actor} host={host} session={session} />
      ))}
    </div>
  );
}

export const spacesPanelModule: AppModule = {
  id: 'spaces-panel',
  register: (host) =>
    host.panels.register({ id: 'spaces', title: 'Spaces', slot: 'left', component: SpacesPanel }),
};
