import { describe, expect, it } from 'vitest';
import {
  keySetting,
  modelSetting,
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
    writeSetting(modelSetting('image'), 'wiro:google/nano-banana');
    upgradeSettings();
    expect(readSetting(keySetting('openrouter'))).toBe('sk-or-1');
    expect(readSetting({ key: 'virtuocity.openrouterKey', fallback: '' })).toBe('');
    expect(readSetting(modelSetting('text'))).toBe('openrouter:anthropic/claude-x');
    expect(readSetting(modelSetting('image'))).toBe('wiro:google/nano-banana');
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
