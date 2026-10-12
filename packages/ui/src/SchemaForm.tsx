import type { JsonSchema } from '@virtuocity/core';
import { Button, IconButton } from './Button';
import { Field, TextArea } from './Field';
import type { TextField } from './LongText';
import { LongText } from './LongText';
import { NumberField } from './NumberField';
import { defaultValue, itemSchema, kindOf, labelFor, propertiesOf } from './schemaFields';

interface FieldProps {
  readonly schema: JsonSchema;
  /** Given to the control, so a surrounding label can point at it. */
  readonly id?: string | undefined;
  readonly value: unknown;
  readonly onChange: (value: unknown) => void;
  /** What the field is called, for help such as "Transform by AI". */
  readonly field?: TextField | undefined;
}

const asRecord = (value: unknown): Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};

function ObjectFields({ schema, value, onChange }: FieldProps) {
  const record = asRecord(value);
  return (
    <div className="v-schema-object">
      {propertiesOf(schema).map(([key, sub]) => (
        <Field key={key} label={sub.title ?? labelFor(key)} hint={sub.description}>
          {(id) => (
            <SchemaField
              id={id}
              schema={sub}
              field={{ label: sub.title ?? labelFor(key), hint: sub.description }}
              value={record[key]}
              onChange={(next) => onChange({ ...record, [key]: next })}
            />
          )}
        </Field>
      ))}
    </div>
  );
}

function ArrayFields({ schema, value, onChange }: FieldProps) {
  const items = Array.isArray(value) ? value : [];
  const item = itemSchema(schema);
  const set = (index: number, next: unknown) =>
    onChange(items.map((v, i) => (i === index ? next : v)));
  return (
    <div className="v-schema-array">
      {items.map((v, i) => (
        <div key={i} className="v-schema-array__item">
          <SchemaField schema={item} value={v} onChange={(next) => set(i, next)} />
          <IconButton
            size="sm"
            icon="trash"
            label="Remove"
            onClick={() => onChange(items.filter((_, j) => j !== i))}
          />
        </div>
      ))}
      <Button size="sm" icon="plus" onClick={() => onChange([...items, defaultValue(item)])}>
        Add
      </Button>
    </div>
  );
}

/** The field a string belongs to: as its object names it, or from its own schema. */
const fieldOf = (schema: JsonSchema, field: TextField | undefined): TextField =>
  field ?? { label: schema.title ?? 'Text', hint: schema.description };

/** One control for any JSON Schema, nesting for objects and lists. */
export function SchemaField({ schema, id, value, onChange, field }: FieldProps) {
  switch (kindOf(schema)) {
    case 'object':
      return <ObjectFields schema={schema} value={value} onChange={onChange} />;
    case 'array':
      return <ArrayFields schema={schema} value={value} onChange={onChange} />;
    case 'boolean':
      return (
        <input
          id={id}
          type="checkbox"
          checked={value === true}
          onChange={(e) => onChange(e.target.checked)}
        />
      );
    case 'number':
      return <NumberField id={id} schema={schema} value={value} onChange={onChange} />;
    case 'enum':
      return (
        <select
          id={id}
          className="v-input"
          value={String(value ?? '')}
          onChange={(e) => onChange(e.target.value)}
        >
          {(schema.enum ?? []).map((option) => (
            <option key={String(option)} value={String(option)}>
              {String(option)}
            </option>
          ))}
        </select>
      );
    case 'string':
      return (
        <LongText
          id={id}
          rows={2}
          field={fieldOf(schema, field)}
          value={typeof value === 'string' ? value : ''}
          onChange={onChange}
        />
      );
    default:
      return <JsonField value={value} onChange={onChange} />;
  }
}

/** Raw JSON for shapes the form doesn't know; invalid JSON is kept as text until it parses. */
function JsonField({ value, onChange }: Omit<FieldProps, 'schema'>) {
  return (
    <TextArea
      rows={4}
      defaultValue={JSON.stringify(value ?? null, null, 2)}
      onChange={(e) => {
        try {
          onChange(JSON.parse(e.target.value));
        } catch {
          // Keep the last valid value while the text is being edited.
        }
      }}
    />
  );
}
