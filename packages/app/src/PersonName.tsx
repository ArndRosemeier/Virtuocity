import { useEffect, useState } from 'react';
import type { SessionRuntime } from '@virtuocity/core';
import { nameProblem } from './ActorDialog';
import { runSafely } from './LibraryActors';
import { useLibraryItems } from './library';
import { USER_ID, personName, renamePerson } from './personName';

/**
 * The name you write under, next to Act. The AI actors see your lines as
 * "Name: …", so it must be a name no actor has. Enter or leaving the field
 * saves it; a taken name is marked and not saved, Escape goes back.
 */
export function PersonName({ session, disabled }: { session: SessionRuntime; disabled: boolean }) {
  const current = personName(session);
  const [draft, setDraft] = useState(current);
  const [problem, setProblem] = useState<string>();
  const library = useLibraryItems().actors.map((i) => i.actor.personality.name);
  useEffect(() => setDraft(current), [current]);
  const taken = [
    ...library,
    ...session.actors.filter((a) => a.id !== USER_ID).map((a) => a.personality.name),
  ];
  const save = () => {
    if (draft.trim() === current) return setProblem(undefined);
    const issue = nameProblem(draft, taken);
    setProblem(issue);
    if (!issue) runSafely(() => renamePerson(session, draft));
  };
  return (
    <input
      className="composer__name"
      aria-label="Your name"
      title={problem ?? 'Your name: the AI actors see your lines under it'}
      aria-invalid={problem !== undefined}
      value={draft}
      disabled={disabled}
      size={Math.max(4, Math.min(16, draft.length))}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={save}
      onKeyDown={(e) => {
        if (e.key === 'Enter') e.currentTarget.blur();
        if (e.key === 'Escape') {
          setDraft(current);
          setProblem(undefined);
        }
      }}
    />
  );
}
