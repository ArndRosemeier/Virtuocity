import { useState } from 'react';
import type { FormEvent } from 'react';
import type { ModelOverrides, SessionRuntime } from '@virtuocity/core';
import {
  Button,
  Field,
  Modal,
  ModelLayerEditor,
  Section,
  TextArea,
  TextInput,
} from '@virtuocity/ui';
import type { AppHost } from './types';
import { useModels } from './useModels';

interface Draft {
  readonly name: string;
  readonly description: string;
  readonly models: ModelOverrides;
}

const EMPTY: Draft = { name: '', description: '', models: {} };

function CharacterFields({
  host,
  draft,
  onChange,
}: {
  host: AppHost;
  draft: Draft;
  onChange: (d: Draft) => void;
}) {
  const catalog = useModels(host);
  return (
    <>
      <Field label="Name">
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
      <Field
        label="Personality"
        hint="Voice, role, backstory, quirks. This is what the model plays."
      >
        {(id) => (
          <TextArea
            id={id}
            rows={5}
            value={draft.description}
            placeholder="A sharp-tongued half-elf bard who hides a soft heart and a stolen map…"
            onChange={(e) => onChange({ ...draft, description: e.target.value })}
          />
        )}
      </Field>
      <Section title="Models">
        <ModelLayerEditor
          modalities={host.modalities.list()}
          catalog={catalog}
          value={draft.models}
          onChange={(models) => onChange({ ...draft, models })}
          inheritLabel="Use the default"
        />
      </Section>
    </>
  );
}

/** Creates an AI character. Its models are optional overrides of the defaults, per modality. */
export function CharacterDialog({
  host,
  session,
  open,
  onClose,
}: {
  host: AppHost;
  session: SessionRuntime;
  open: boolean;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState<Draft>(EMPTY);

  const submit = (e?: FormEvent) => {
    e?.preventDefault();
    if (!draft.name.trim()) return;
    void session.join({
      id: crypto.randomUUID(),
      controller: 'ai',
      personality: { name: draft.name.trim(), description: draft.description.trim() },
      skillIds: ['conversation'],
      ...(Object.keys(draft.models).length > 0 ? { models: draft.models } : {}),
    });
    setDraft(EMPTY);
    onClose();
  };

  const footer = (
    <>
      <Button variant="ghost" onClick={onClose}>
        Cancel
      </Button>
      <Button variant="primary" icon="plus" disabled={!draft.name.trim()} onClick={() => submit()}>
        Add to scene
      </Button>
    </>
  );

  return (
    <Modal open={open} size="sm" title="New character" onClose={onClose} footer={footer}>
      <form className="stack" onSubmit={submit}>
        <CharacterFields host={host} draft={draft} onChange={setDraft} />
      </form>
    </Modal>
  );
}
