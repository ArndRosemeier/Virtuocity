import type { ModelOverrides, Skill } from '@virtuocity/core';
import { actorUse, readSettings, z } from '@virtuocity/core';
import { Field, LongText, ModelLayerEditor, SchemaField, Section, TextInput } from '@virtuocity/ui';
import type { AppHost } from './types';
import { useProviderCatalogs } from './useModels';

export interface Draft {
  readonly name: string;
  readonly description: string;
  readonly models: ModelOverrides;
  readonly skillIds: readonly string[];
  readonly settings: Readonly<Record<string, unknown>>;
  readonly profile: Readonly<Record<string, unknown>>;
}

interface FieldsProps {
  readonly host: AppHost;
  readonly draft: Draft;
  readonly onChange: (d: Draft) => void;
}

/** What a skill can stand in for, as a hover text, e.g. "Contracts: director". */
const contractsTip = (skill: Skill) => {
  const ids = (skill.implements ?? []).map((i) => i.contract.id);
  return ids.length > 0 ? `Contracts: ${ids.join(', ')}` : undefined;
};

/** Which skills the actor has; hovering a skill shows its contracts. */
function SkillPicker({ host, draft, onChange }: FieldsProps) {
  const value = draft.skillIds;
  const toggle = (id: string, on: boolean) =>
    onChange({ ...draft, skillIds: on ? [...value, id] : value.filter((v) => v !== id) });
  return (
    <ul className="skill-picker">
      {host.skills.list().map((skill) => (
        <li key={skill.id}>
          <label title={contractsTip(skill)}>
            <input
              type="checkbox"
              checked={value.includes(skill.id)}
              onChange={(e) => toggle(skill.id, e.target.checked)}
            />
            <span>{skill.name}</span>
          </label>
        </li>
      ))}
    </ul>
  );
}

/** A settings form for each chosen skill that has settings. */
function SkillSettings({ host, draft, onChange }: FieldsProps) {
  const skills = draft.skillIds
    .map((id) => host.skills.find(id))
    .flatMap((s) => (s?.settings ? [{ ...s, settings: s.settings }] : []));
  return skills.map((skill) => (
    <Section key={skill.id} title={`${skill.name} settings`}>
      <SchemaField
        schema={z.toJSONSchema(skill.settings)}
        value={readSettings(skill.settings, draft.settings[skill.id])}
        onChange={(next) =>
          onChange({ ...draft, settings: { ...draft.settings, [skill.id]: next } })
        }
      />
    </Section>
  ));
}

/** Fields that installed modules add to every actor's profile. */
function ProfileFields({ host, draft, onChange }: FieldsProps) {
  const fields = host.profileFields.list();
  if (fields.length === 0) return null;
  return (
    <Section title="Profile">
      {fields.map((field) => (
        <Field key={field.id} label={field.label} hint={field.description}>
          {(id) => (
            <SchemaField
              id={id}
              schema={z.toJSONSchema(field.schema)}
              value={draft.profile[field.id]}
              onChange={(next) =>
                onChange({ ...draft, profile: { ...draft.profile, [field.id]: next } })
              }
            />
          )}
        </Field>
      ))}
    </Section>
  );
}

const PERSONALITY_HINT = 'Voice, role, backstory, quirks. This is what the model plays.';
const PERSONALITY_EXAMPLE =
  'A sharp-tongued half-elf bard who hides a soft heart and a stolen map…';
const DESCRIPTION_HINT = 'What this actor is for, in a line. Lists such as New session show it.';

/** Who the actor is and what it can do: a personality when a chosen skill voices it, else a description. */
function NameSkillsPersonality({
  host,
  draft,
  onChange,
  persona,
  nameError,
}: FieldsProps & { persona: boolean; nameError?: string | undefined }) {
  return (
    <>
      <Field
        label="Name"
        hint={nameError ? <span className="composer__error">{nameError}</span> : undefined}
      >
        {(id) => (
          <TextInput
            id={id}
            autoFocus
            value={draft.name}
            placeholder="Lyra Moonwhisper"
            onChange={(e) => onChange({ ...draft, name: e.target.value })}
          />
        )}
      </Field>
      <Section title="Skills">
        <SkillPicker host={host} draft={draft} onChange={onChange} />
      </Section>
      <Field
        label={persona ? 'Personality' : 'Description'}
        hint={persona ? PERSONALITY_HINT : DESCRIPTION_HINT}
      >
        {(id) => (
          <LongText
            id={id}
            rows={persona ? 5 : 2}
            field={
              persona
                ? { label: 'Personality', hint: PERSONALITY_HINT }
                : { label: 'Description', hint: DESCRIPTION_HINT }
            }
            value={draft.description}
            placeholder={persona ? PERSONALITY_EXAMPLE : 'A narrator tells the story with you.'}
            onChange={(description) => onChange({ ...draft, description })}
          />
        )}
      </Field>
    </>
  );
}

/**
 * Two columns: the name, skills and personality on the left; profile, skill
 * settings and models on the right. Only what the chosen skills use is asked
 * for: personality for skills that voice it, profile fields such as
 * appearance for characters, models for the modalities in use.
 */
export function ActorFields({
  host,
  draft,
  onChange,
  nameError,
}: FieldsProps & { nameError?: string | undefined }) {
  const providers = useProviderCatalogs(host);
  const skills = draft.skillIds.flatMap((id) => host.skills.find(id) ?? []);
  const use = actorUse(skills);
  const modalities = host.modalities.list().filter((m) => use.modalities.includes(m.id));
  const hasSettings = skills.some((s) => s.settings);
  return (
    <div className="actor-fields">
      <div className="stack">
        <NameSkillsPersonality
          host={host}
          draft={draft}
          onChange={onChange}
          persona={use.persona}
          nameError={nameError}
        />
      </div>
      <div className="stack">
        {use.character && <ProfileFields host={host} draft={draft} onChange={onChange} />}
        <SkillSettings host={host} draft={draft} onChange={onChange} />
        {modalities.length > 0 && (
          <Section title="Models">
            <ModelLayerEditor
              modalities={modalities}
              providers={providers}
              value={draft.models}
              onChange={(models) => onChange({ ...draft, models })}
              inheritLabel="Use the default"
            />
          </Section>
        )}
        {!hasSettings && modalities.length === 0 && (
          <p className="muted">The chosen skills have nothing to set up.</p>
        )}
      </div>
    </div>
  );
}
