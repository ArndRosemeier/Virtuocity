import { useState } from 'react';
import { Button, Field, Modal, ModelLayerEditor, SecretInput, Section, Tabs } from '@virtuocity/ui';
import type { TabDef } from '@virtuocity/ui';
import { CONNECTIONS } from './connections';
import type { Connection } from './connections';
import { THEME, keySetting, useModelDefaults, useSetting, writeModelDefaults } from './settings';
import { BackupTab } from './BackupTab';
import { DefaultActors } from './DefaultActors';
import { RendererSelect } from './RendererSelect';
import { RENDERER, rendererActors } from './storyView';
import type { ThemeChoice } from './theme';
import type { AppHost } from './types';
import { useProviderCatalogs } from './useModels';

function KeyField({ connection }: { connection: Connection }) {
  const [key, setKey] = useSetting(keySetting(connection.providerId));
  return (
    <Section title={connection.label}>
      <Field
        label="API key"
        hint={
          <>
            {connection.offers} Stored only in this browser and sent only to {connection.label}. Get
            a key and set spending limits at{' '}
            <a href={connection.keysUrl} target="_blank" rel="noreferrer">
              {connection.keysSite}
            </a>
            .
          </>
        }
      >
        {(id) => (
          <SecretInput
            id={id}
            value={key}
            placeholder={connection.placeholder}
            onChange={(e) => setKey(e.target.value)}
          />
        )}
      </Field>
    </Section>
  );
}

function ConnectionTab() {
  return (
    <>
      <p className="settings-note">
        Add a key for every provider you want to use. Model pickers offer only providers that are
        set up.
      </p>
      {CONNECTIONS.map((c) => (
        <KeyField key={c.providerId} connection={c} />
      ))}
    </>
  );
}

function ModelsTab({ host }: { host: AppHost }) {
  const providers = useProviderCatalogs(host);
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
        providers={providers}
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
      <Section title="Session view">
        <RendererSelect
          host={host}
          label="New sessions are drawn as"
          hint="Each session can change its own view in the cast panel."
          value={known ? renderer : ''}
          onChange={setRenderer}
        />
      </Section>
    </>
  );
}

export type SettingsTab = 'connection' | 'models' | 'appearance' | 'backup';

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
    {
      id: 'backup',
      label: 'Save & load',
      icon: 'download',
      content: () => (
        <>
          <BackupTab />
          <DefaultActors host={host} />
        </>
      ),
    },
  ];
  return (
    <Modal open={open} title="Settings" onClose={onClose} doneLabel="Done">
      <Tabs tabs={tabs} active={tab} onChange={setTab} />
    </Modal>
  );
}
