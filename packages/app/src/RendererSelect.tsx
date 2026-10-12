import { Field } from '@virtuocity/ui';
import { renderSkills } from './storyView';
import type { AppHost } from './types';

interface RendererSelectProps {
  readonly host: AppHost;
  readonly label: string;
  readonly hint: string;
  readonly value: string;
  readonly onChange: (skillId: string) => void;
}

/** Picks the render skill that draws a story. */
export function RendererSelect({ host, label, hint, value, onChange }: RendererSelectProps) {
  return (
    <Field label={label} hint={hint}>
      {(id) => (
        <select
          id={id}
          className="v-input"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        >
          {renderSkills(host).map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      )}
    </Field>
  );
}
