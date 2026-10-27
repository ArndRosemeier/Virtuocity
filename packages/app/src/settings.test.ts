import { describe, expect, it } from 'vitest';
import {
  keySetting,
  modelSetting,
  reasoningSetting,
  readModelDefaults,
  writeModelDefaults,
  readAllSettings,
  readSetting,
  replaceAllSettings,
  upgradeSettings,
  writeSetting,
} from './settings';

describe('settings', () => {
  it('moves the old OpenRouter key and gives old default models to OpenRouter', () => {
    writeSetting({ key: 'virtuocity.openrouterKey', fallback: '' }, 'sk-or-1');
    writeSetting(modelSetting('text'), 'anthropic/claude-x');
    writeSetting(modelSetting('image'), 'openai:gpt-image-1');
    upgradeSettings();
    expect(readSetting(keySetting('openrouter'))).toBe('sk-or-1');
    expect(readSetting({ key: 'virtuocity.openrouterKey', fallback: '' })).toBe('');
    expect(readSetting(modelSetting('text'))).toBe('openrouter:anthropic/claude-x');
    expect(readSetting(modelSetting('image'))).toBe('openai:gpt-image-1');
  });

  it('saves effort beside model ids and keeps old string choices compatible', () => {
    const modalities = [{ id: 'text', label: 'Text', description: '' }];
    writeModelDefaults(modalities, {
      text: { model: 'openrouter:openai/gpt-6', reasoningEffort: 'high' },
    });
    expect(readSetting(modelSetting('text'))).toBe('openrouter:openai/gpt-6');
    expect(readSetting(reasoningSetting('text'))).toBe('high');
    expect(readModelDefaults(modalities).text).toEqual({
      model: 'openrouter:openai/gpt-6',
      reasoningEffort: 'high',
    });
    writeModelDefaults(modalities, { text: 'openai:gpt-6' });
    expect(readSetting(reasoningSetting('text'))).toBe('');
    expect(readModelDefaults(modalities).text).toBe('openai:gpt-6');
  });

  it('never saves or replaces provider keys', () => {
    writeSetting(keySetting('anthropic'), 'sk-ant-1');
    expect(Object.keys(readAllSettings()).some((k) => k.includes('key'))).toBe(false);
    replaceAllSettings({
      'virtuocity.key.anthropic': 'stolen',
      'virtuocity.model.text': 'x/y',
    });
    expect(readSetting(keySetting('anthropic'))).toBe('sk-ant-1');
    expect(readSetting(modelSetting('text'))).toBe('openrouter:x/y');
  });
});
