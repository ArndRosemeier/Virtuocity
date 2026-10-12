import { createContext, useContext, useState } from 'react';
import type { TextareaHTMLAttributes } from 'react';
import { Button } from './Button';
import { TextArea } from './Field';

/** The field a text belongs to, so a model knows what to write. */
export interface TextField {
  readonly label: string;
  readonly hint?: string | undefined;
}

/** Turns a field's text (e.g. "grumpy teen") into a fuller one, typically with a model. */
export type TransformText = (field: TextField, text: string) => Promise<string>;

/** Where long text fields find "Transform by AI"; without it they are plain text areas. */
export const TransformTextContext = createContext<TransformText | null>(null);

type Props = Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'value' | 'onChange'> & {
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly field: TextField;
};

/**
 * A text area for text longer than a few words, with "Transform by AI" when
 * the app offers it: write a few words, get a fuller text, undo if you like.
 */
export function LongText({ value, onChange, field, ...rest }: Props) {
  const transform = useContext(TransformTextContext);
  const [busy, setBusy] = useState(false);
  const [before, setBefore] = useState<string | null>(null);
  const [error, setError] = useState('');
  const run = async (transformer: TransformText) => {
    setBusy(true);
    setError('');
    try {
      const next = await transformer(field, value);
      setBefore(value);
      onChange(next);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };
  const undo = (previous: string) => {
    onChange(previous);
    setBefore(null);
  };
  return (
    <div className="v-longtext">
      <TextArea value={value} onChange={(e) => onChange(e.target.value)} {...rest} />
      {transform && (
        <div className="v-longtext__actions">
          <Button
            size="sm"
            variant="ghost"
            icon="sparkles"
            disabled={busy || !value.trim()}
            onClick={() => void run(transform)}
          >
            {busy ? 'Transforming…' : 'Transform by AI'}
          </Button>
          {before !== null && !busy && (
            <Button size="sm" variant="ghost" icon="restart" onClick={() => undo(before)}>
              Undo
            </Button>
          )}
          {error && <span className="v-longtext__error">{error}</span>}
        </div>
      )}
    </div>
  );
}
