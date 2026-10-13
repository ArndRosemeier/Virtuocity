import { useEffect, useState } from 'react';
import type { Actor, Importance, SessionTypeDescription } from '@virtuocity/core';
import { Button, Modal, Pill } from '@virtuocity/ui';
import { ActorDialog } from './ActorDialog';
import { runSafely } from './LibraryActors';
import { useLibrary, useLibraryItems } from './library';
import type { AppHost } from './types';
import type { RoleStep, StepPick } from './wizard';
import { describeType, resolvePicks, roleSteps } from './wizard';

const IMPORTANCE: Record<Importance, string> = {
  needed: 'Needed',
  recommended: 'Recommended',
  optional: 'Optional',
};

interface WizardProps {
  readonly host: AppHost;
  readonly type: Actor;
  readonly onBack: () => void;
  readonly onClose: () => void;
  readonly onStart: (actors: readonly Actor[]) => void;
}

/** What the session type says about itself, once it has answered. */
function useDescription(host: AppHost, type: Actor): SessionTypeDescription | undefined {
  const [description, setDescription] = useState<SessionTypeDescription>();
  useEffect(() => {
    let current = true;
    void describeType(host, type).then((d) => current && setDescription(d));
    return () => {
      current = false;
    };
  }, [host, type]);
  return description;
}

/** One role: the question, how much it matters, and who could fill it. */
function RoleQuestion(props: {
  step: RoleStep;
  options: readonly Actor[];
  chosen: StepPick;
  onPick: (id: string | null) => void;
  onNew: () => void;
}) {
  const { step, options, chosen, onPick, onNew } = props;
  const { role } = step;
  const choice = (id: string | null, label: string, note?: string) => (
    <label key={id ?? ''} className="blueprint" data-selected={chosen === id}>
      <input type="radio" name="wizard-pick" checked={chosen === id} onChange={() => onPick(id)} />
      <span className="blueprint__text">
        <strong>{label}</strong>
        {note && <span className="muted">{note}</span>}
      </span>
    </label>
  );
  return (
    <div className="stack">
      <h3 className="wizard__question">
        {role.question || role.label} <Pill>{IMPORTANCE[role.importance]}</Pill>
      </h3>
      {role.hint && <p className="muted">{role.hint}</p>}
      {!step.available && <p className="muted">No installed skill can do this yet.</p>}
      <div className="blueprints" role="radiogroup" aria-label={role.label}>
        {options.map((a) => choice(a.id, a.personality.name, a.personality.description))}
        {choice(null, 'Nobody', role.without && `Without it: ${role.without}`)}
      </div>
      <Button icon="plus" onClick={onNew}>
        Make a new one
      </Button>
    </div>
  );
}

/**
 * Walks through the session type's roles one question at a time: pick a
 * library actor, make a new one with the skills the role needs, or nobody.
 * It knows no kinds of session; the type's roles say what to ask.
 */
export function SetupWizard(props: WizardProps) {
  const description = useDescription(props.host, props.type);
  if (!description) {
    return (
      <Modal open title={props.type.personality.name} onClose={props.onClose}>
        <p className="muted">Reading the session type…</p>
      </Modal>
    );
  }
  return <Steps {...props} description={description} />;
}

/** Back (to the name at the first step), and Next, or Start at the last; Next waits for a pick. */
function WizardFooter(props: {
  last: boolean;
  ready: boolean;
  onBack: () => void;
  onNext: () => void;
}) {
  return (
    <>
      <Button variant="ghost" onClick={props.onBack}>
        Back
      </Button>
      <Button variant="primary" disabled={!props.ready} onClick={props.onNext}>
        {props.last ? 'Start' : 'Next'}
      </Button>
    </>
  );
}

function Steps({
  host,
  type,
  description,
  onBack,
  onClose,
  onStart,
}: WizardProps & { description: SessionTypeDescription }) {
  const library = useLibrary();
  const items = useLibraryItems().actors.map((i) => i.actor);
  const steps = roleSteps(description, host.skills.list(), items);
  const [at, setAt] = useState(0);
  const [picks, setPicks] = useState<StepPick[]>([]);
  const [creating, setCreating] = useState(false);
  const chosen = resolvePicks(steps, picks);
  const ids = (list: StepPick[]) => list.filter((id): id is string => typeof id === 'string');
  const pick = (id: string | null) => setPicks((p) => Object.assign([...p], { [at]: id }));
  const step = steps[at];
  const last = at >= steps.length - 1;
  const start = () =>
    onStart([...new Set(ids(chosen))].flatMap((id) => items.find((a) => a.id === id) ?? []));
  const footer = (
    <WizardFooter
      last={last}
      ready={step === undefined || chosen[at] !== undefined}
      onBack={() => (at === 0 ? onBack() : setAt(at - 1))}
      onNext={() => (last ? start() : setAt(at + 1))}
    />
  );

  const progress = steps.length === 0 ? 'ready' : `${at + 1} of ${steps.length}`;
  return (
    <Modal open title={`${type.personality.name}: ${progress}`} onClose={onClose} footer={footer}>
      {step ? (
        <RoleQuestion
          step={step}
          options={step.candidates.filter((a) => !ids(chosen.slice(0, at)).includes(a.id))}
          chosen={chosen[at]}
          onPick={pick}
          onNew={() => setCreating(true)}
        />
      ) : (
        <p className="muted">
          {type.personality.name} needs nobody else. Start when you are ready.
        </p>
      )}
      {creating && step && (
        <ActorDialog
          host={host}
          open
          skillIds={step.skills}
          takenNames={items.map((a) => a.personality.name)}
          onClose={() => setCreating(false)}
          onSave={(a) => runSafely(() => library.saveActor(a).then(() => pick(a.id)))}
        />
      )}
    </Modal>
  );
}
