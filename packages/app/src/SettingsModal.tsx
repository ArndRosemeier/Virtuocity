import { useState } from 'react';
import { Button, Field, Modal, ModelLayerEditor, SecretInput, Section, Tabs } from '@virtuocity/ui';
import type { TabDef } from '@virtuocity/ui';
import { API_KEY, THEME, useModelDefaults, useSetting, writeModelDefaults } from './settings';
import { RendererSelect } from './RendererSelect';
import { RENDERER, rendererActors } from './storyView';
import type { ThemeChoice } from './theme';
import type { AppHost } from './types';
import { useModels } from './useModels';

function ConnectionTab() {
  const [key, setKey] = useSetting(API_KEY);
  return (
    <Section title="OpenRouter">
      <Field
        label="API key"
        hint={
          <>
            Stored only in this browser and sent only to OpenRouter. Set spending limits on the key
            itself at{' '}
            <a href="https://openrouter.ai/settings/keys" target="_blank" rel="noreferrer">
              openrouter.ai
            </a>
            .
          </>
        }
      >
        {(id) => (
          <SecretInput
            id={id}
            value={key}
            placeholder="sk-or-…"
            onChange={(e) => setKey(e.target.value)}
          />
        )}
      </Field>
    </Section>
  );
}

function ModelsTab({ host }: { host: AppHost }) {
  const catalog = useModels(host);
  const modalities = host.modalities.list();
  const defaults = useModelDefaults(modalities);
  return (
    <Section title="Default model per modality">
      <p className="settings-note">
        Actors and skills can override these. A skill's choice beats the actor's, which beats the
        default.
      </p>
      <ModelLayerEditor
        modalities={modalities}
        catalog={catalog}
        value={defaults}
        onChange={(next) => writeModelDefaults(modalities, next)}
        inheritLabel="Not set"
      />
    </Section>
  );
}

const THEMES: readonly { id: ThemeChoice; label: string }[] = [
  { id: 'system', label: 'System' },
  { id: 'dark', label: 'Dark' },
  { id: 'light', label: 'Light' },
];

function AppearanceTab({ host }: { host: AppHost }) {
  const [theme, setTheme] = useSetting(THEME);
  const [renderer, setRenderer] = useSetting(RENDERER);
  const known = rendererActors(host).some((a) => a.id === renderer);
  return (
    <>
      <Section title="Theme">
        <div className="segmented" role="radiogroup" aria-label="Theme">
          {THEMES.map((t) => (
            <Button
              key={t.id}
              role="radio"
              aria-checked={theme === t.id}
              variant={theme === t.id ? 'primary' : 'secondary'}
              onClick={() => setTheme(t.id)}
            >
              {t.label}
            </Button>
          ))}
        </div>
      </Section>
      <Section title="Story view">
        <RendererSelect
          host={host}
          label="New stories are drawn as"
          hint="Each story can change its own view in the cast panel."
          value={known ? renderer : ''}
          onChange={setRenderer}
        />
      </Section>
    </>
  );
}

export type SettingsTab = 'connection' | 'models' | 'appearance';

export function SettingsModal({
  host,
  open,
  initialTab = 'connection',
  onClose,
}: {
  host: AppHost;
  open: boolean;
  initialTab?: SettingsTab;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<string>(initialTab);
  const tabs: TabDef[] = [
    { id: 'connection', label: 'Connection', icon: 'key', content: () => <ConnectionTab /> },
    { id: 'models', label: 'Models', icon: 'sparkles', content: () => <ModelsTab host={host} /> },
    {
      id: 'appearance',
      label: 'Appearance',
      icon: 'palette',
      content: () => <AppearanceTab host={host} />,
    },
  ];
  return (
    <Modal open={open} title="Settings" onClose={onClose} doneLabel="Done">
      <Tabs tabs={tabs} active={tab} onChange={setTab} />
    </Modal>
  );
}
