import { useState } from 'react';
import type { Setting } from './settings';
import { API_KEY, TEXT_MODEL, readSetting, writeSetting } from './settings';

function SettingInput({
  setting,
  label,
  secret,
}: {
  setting: Setting;
  label: string;
  secret?: boolean;
}) {
  const [value, setValue] = useState(() => readSetting(setting));
  return (
    <input
      aria-label={label}
      placeholder={label}
      type={secret ? 'password' : 'text'}
      value={value}
      onChange={(e) => {
        setValue(e.target.value);
        writeSetting(setting, e.target.value);
      }}
    />
  );
}

export function SettingsBar() {
  return (
    <div className="settings">
      <SettingInput setting={TEXT_MODEL} label="Default text model" />
      <SettingInput setting={API_KEY} label="OpenRouter key" secret />
    </div>
  );
}
