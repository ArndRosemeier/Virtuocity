import { useState } from 'react';
import type { JsonSchema } from '@virtuocity/core';
import { TextInput } from './Field';
import { numberFromText, rangeText } from './numberText';

/**
 * A number you type, without spin arrows. The value is kept within the
 * schema's range, but the text stays as typed while the field has focus, so
 * partial input such as "3" on the way to "300" is not replaced.
 */
export function NumberField({
  id,
  schema,
  value,
  onChange,
}: {
  id?: string | undefined;
  schema: JsonSchema;
  value: unknown;
  onChange: (value: number | undefined) => void;
}) {
  const shown = typeof value === 'number' ? String(value) : '';
  const [text, setText] = useState<string | null>(null);
  return (
    <TextInput
      id={id}
      inputMode={schema.type === 'integer' ? 'numeric' : 'decimal'}
      value={text ?? shown}
      placeholder={rangeText(schema)}
      onChange={(e) => {
        setText(e.target.value);
        onChange(numberFromText(e.target.value, schema));
      }}
      onBlur={() => setText(null)}
    />
  );
}
