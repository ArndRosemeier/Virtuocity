import { useId, useState } from 'react';
import type { ComponentProps, InputHTMLAttributes, ReactNode, TextareaHTMLAttributes } from 'react';
import { IconButton } from './Button';

/** Label + control + hint. The control receives the generated id. */
export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: ReactNode;
  children: (id: string) => ReactNode;
}) {
  const id = useId();
  return (
    <div className="v-field">
      <label className="v-field__label" htmlFor={id}>
        {label}
      </label>
      {children(id)}
      {hint && <div className="v-field__hint">{hint}</div>}
    </div>
  );
}

export function TextInput(props: ComponentProps<'input'>) {
  return <input className="v-input" {...props} />;
}

export function TextArea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className="v-textarea" {...props} />;
}

/** A password-style input with a show/hide toggle. */
export function SecretInput(props: Omit<InputHTMLAttributes<HTMLInputElement>, 'type'>) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="v-input-group">
      <TextInput
        {...props}
        type={visible ? 'text' : 'password'}
        autoComplete="off"
        spellCheck={false}
      />
      <IconButton
        variant="secondary"
        icon={visible ? 'eyeOff' : 'eye'}
        label={visible ? 'Hide' : 'Show'}
        onClick={() => setVisible((v) => !v)}
      />
    </div>
  );
}
