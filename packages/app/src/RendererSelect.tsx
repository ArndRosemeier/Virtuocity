import { Field } from '@virtuocity/ui';
import { rendererActors } from './storyView';
import type { AppHost } from './types';

interface RendererSelectProps {
  readonly host: AppHost;
  readonly label: string;
  readonly hint: string;
  /** The renderer actor's id, or empty when the view was changed by hand. */
  readonly value: string;
  readonly onChange: (actorId: string) => void;
}

/** Picks the renderer actor that draws a story. */
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
          {value === '' && <option value="">Your own</option>}
          {rendererActors(host).map((a) => (
            <option key={a.id} value={a.id}>
              {a.personality.name}
            </option>
          ))}
        </select>
      )}
    </Field>
  );
}
