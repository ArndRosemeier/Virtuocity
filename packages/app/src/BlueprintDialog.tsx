import { useState } from 'react';
import type {
  Blueprint,
  BlueprintRole,
  CastChoices,
  RoleChoice,
  SavedSetup,
  Skill,
} from '@virtuocity/core';
import {
  blueprintProblems,
  castBlueprint,
  defaultChoices,
  roleNeeds,
  startBlueprint,
  startSavedSetup,
} from '@virtuocity/core';
import { Avatar, Button, Modal, Pill } from '@virtuocity/ui';
import { useLibraryItems } from './library';
import type { PanelProps } from './types';
import { ensureCast } from './useSession';

/** Starting without a blueprint: just you, adding actors yourself. */
const EMPTY = '';

function Choice({
  id,
  name,
  description,
  problems = [],
  selected,
  onSelect,
}: {
  id: string;
  name: string;
  description: string;
  problems?: readonly string[];
  selected: boolean;
  onSelect: (id: string) => void;
}) {
  return (
    <label className="blueprint" data-selected={selected}>
      <input
        type="radio"
        name="blueprint"
        checked={selected}
        disabled={problems.length > 0}
        onChange={() => onSelect(id)}
      />
      <span className="blueprint__text">
        <strong>{name}</strong>
        <span className="muted">{description}</span>
        {problems.map((p) => (
          <span key={p} className="composer__error">
            {p}
          </span>
        ))}
      </span>
    </label>
  );
}

const needLabel = (id: string) => (id === 'speaks' ? 'Speaks' : id);

/** One role: whether it is cast, and which skill fills each need when there is a choice. */
function RoleRow({
  role,
  skills,
  choice,
  onChange,
}: {
  role: BlueprintRole;
  skills: readonly Skill[];
  choice: RoleChoice;
  onChange: (choice: RoleChoice) => void;
}) {
  const needs = roleNeeds(role, skills);
  const pick = (index: number, skillId: string) =>
    onChange({ ...choice, skillIds: choice.skillIds.map((s, i) => (i === index ? skillId : s)) });
  return (
    <li className="role" data-included={choice.included}>
      {role.optional && (
        <input
          type="checkbox"
          aria-label={`Include ${role.personality.name}`}
          checked={choice.included}
          disabled={needs.some((n) => n.options.length === 0)}
          onChange={(e) => onChange({ ...choice, included: e.target.checked })}
        />
      )}
      <Avatar name={role.personality.name} />
      <span className="role__name">{role.personality.name}</span>
      {needs.map((need, i) =>
        need.options.length > 1 ? (
          <select
            key={need.id}
            className="v-input role__pick"
            aria-label={`${role.personality.name}: ${needLabel(need.id)}`}
            value={choice.skillIds[i]}
            onChange={(e) => pick(i, e.target.value)}
          >
            {need.options.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        ) : (
          <Pill key={need.id}>{need.options[0]?.name ?? needLabel(need.id)}</Pill>
        ),
      )}
    </li>
  );
}

function Roles({
  blueprint,
  skills,
  choices,
  onChange,
}: {
  blueprint: Blueprint;
  skills: readonly Skill[];
  choices: CastChoices;
  onChange: (choices: CastChoices) => void;
}) {
  return (
    <ul className="roles">
      {blueprint.roles.map((role) => {
        const choice = choices[role.id];
        if (!choice) return null;
        const update = (next: RoleChoice) => onChange({ ...choices, [role.id]: next });
        return (
          <RoleRow key={role.id} role={role} skills={skills} choice={choice} onChange={update} />
        );
      })}
    </ul>
  );
}

/** Every installed blueprint, the setups saved in the library, and starting empty. */
function Blueprints({
  host,
  setups,
  selected,
  onSelect,
}: Pick<PanelProps, 'host'> & {
  setups: readonly SavedSetup[];
  selected: string;
  onSelect: (id: string) => void;
}) {
  const skills = host.skills.list();
  return (
    <div className="blueprints" role="radiogroup" aria-label="Setup">
      {host.blueprints.list().map((b) => (
        <Choice
          key={b.id}
          id={b.id}
          name={b.name}
          description={b.description}
          problems={blueprintProblems(b, skills)}
          selected={selected === b.id}
          onSelect={onSelect}
        />
      ))}
      {setups.map((s) => (
        <Choice
          key={s.id}
          id={s.id}
          name={s.name}
          description={`Saved setup: ${s.description}`}
          selected={selected === s.id}
          onSelect={onSelect}
        />
      ))}
      <Choice
        id={EMPTY}
        name="Empty"
        description="Just you. Add actors yourself."
        selected={selected === EMPTY}
        onSelect={onSelect}
      />
    </div>
  );
}

/** Starts a new session from a blueprint, or empty. Replaces the current session. */
export function BlueprintDialog({
  host,
  session,
  open,
  onClose,
}: PanelProps & { open: boolean; onClose: () => void }) {
  const skills = host.skills.list();
  const blueprints = host.blueprints.list();
  const usable = blueprints.find((b) => blueprintProblems(b, skills).length === 0);
  const [selected, setSelected] = useState(usable?.id ?? EMPTY);
  const blueprint = host.blueprints.find(selected);
  const { setups } = useLibraryItems();
  const saved = setups.find((s) => s.id === selected);
  const [choices, setChoices] = useState(() =>
    blueprint ? defaultChoices(blueprint, skills) : {},
  );

  const select = (id: string) => {
    setSelected(id);
    const next = host.blueprints.find(id);
    setChoices(next ? defaultChoices(next, skills) : {});
  };

  const start = async () => {
    await session.workspace.load([], null);
    await ensureCast(host, session);
    if (blueprint) await startBlueprint(session, blueprint, castBlueprint(blueprint, choices));
    else if (saved) await startSavedSetup(session, saved, host.blueprints);
    onClose();
  };

  const footer = (
    <>
      <Button variant="ghost" onClick={onClose}>
        Cancel
      </Button>
      <Button variant="primary" icon="sparkles" onClick={() => void start()}>
        Start
      </Button>
    </>
  );

  return (
    <Modal open={open} title="New session" onClose={onClose} footer={footer}>
      <div className="stack">
        <p className="muted">
          This replaces the current session. Save it to a file first if you want to keep it.
        </p>
        <Blueprints host={host} setups={setups} selected={selected} onSelect={select} />
        {blueprint && (
          <Roles blueprint={blueprint} skills={skills} choices={choices} onChange={setChoices} />
        )}
      </div>
    </Modal>
  );
}
