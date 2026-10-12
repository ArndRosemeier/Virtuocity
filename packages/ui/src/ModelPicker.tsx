import { useEffect, useMemo, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import type { ModelInfo } from '@virtuocity/core';
import { formatPricing, formatTokens } from './format';
import { Icon } from './Icon';
import type { Choice } from './modelSearch';
import { buildChoices } from './modelSearch';
import { Pill } from './Pill';

export interface ModelPickerProps {
  readonly models: readonly ModelInfo[];
  /** Selected model id; `undefined` means "use the default". */
  readonly value: string | undefined;
  readonly onChange: (id: string | undefined) => void;
  readonly loading?: boolean;
  readonly error?: string | undefined;
  /** Label of the "no override" choice; omit to make a model required. */
  readonly defaultLabel?: string;
  readonly id?: string;
}

function ModelMeta({ model }: { model: ModelInfo }) {
  const price = formatPricing(model);
  return (
    <span className="v-picker__meta">
      {model.contextLength && (
        <Pill title="Context window">{formatTokens(model.contextLength)}</Pill>
      )}
      {price && <Pill title="USD per million tokens, prompt / completion">{price}</Pill>}
    </span>
  );
}

function useChoices(props: ModelPickerProps, query: string): Choice[] {
  return useMemo(
    () => buildChoices(props.models, props.defaultLabel, query),
    [props.models, props.defaultLabel, query],
  );
}

function subtitle(props: ModelPickerProps, model: ModelInfo | undefined): string {
  if (props.loading) return 'Loading models…';
  if (props.error) return props.error;
  if (model) return model.id;
  return props.value ? 'Custom model id' : 'No model chosen here';
}

function Current({ props }: { props: ModelPickerProps }) {
  const model = props.models.find((m) => m.id === props.value);
  const name = model?.name ?? props.value ?? props.defaultLabel ?? 'Choose a model';
  return (
    <span className="v-picker__current">
      <span className="v-picker__name">{name}</span>
      <span className="v-picker__id">{subtitle(props, model)}</span>
    </span>
  );
}

function usePicker(props: ModelPickerProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const root = useRef<HTMLDivElement>(null);
  const choices = useChoices(props, query);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  const pick = (choice: Choice | undefined) => {
    if (!choice) return;
    props.onChange(choice.value);
    setOpen(false);
    setQuery('');
  };

  const onKey = (e: KeyboardEvent) => {
    const moves: Record<string, () => void> = {
      ArrowDown: () => setActive((i) => Math.min(i + 1, choices.length - 1)),
      ArrowUp: () => setActive((i) => Math.max(i - 1, 0)),
      Enter: () => pick(choices[active]),
      Escape: () => setOpen(false),
    };
    const move = moves[e.key];
    if (!move) return;
    e.preventDefault();
    e.stopPropagation();
    move();
  };

  const search = (value: string) => {
    setQuery(value);
    setActive(0);
  };

  return { open, setOpen, query, search, active, setActive, root, choices, pick, onKey };
}

/** Searchable model list with price and context, plus custom ids when the catalog can't load. */
export function ModelPicker(props: ModelPickerProps) {
  const p = usePicker(props);
  return (
    <div className="v-picker" ref={p.root}>
      <button
        type="button"
        id={props.id}
        className="v-picker__trigger"
        aria-haspopup="listbox"
        aria-expanded={p.open}
        onClick={() => p.setOpen((o) => !o)}
      >
        <Current props={props} />
        <Icon name="chevron" />
      </button>
      {p.open && (
        <div className="v-picker__popover">
          <div className="v-picker__search">
            <input
              className="v-input"
              autoFocus
              placeholder="Search models or type an id…"
              value={p.query}
              onChange={(e) => p.search(e.target.value)}
              onKeyDown={p.onKey}
            />
          </div>
          <OptionList
            choices={p.choices}
            active={p.active}
            value={props.value}
            onPick={p.pick}
            onHover={p.setActive}
          />
        </div>
      )}
    </div>
  );
}

function OptionList({
  choices,
  active,
  value,
  onPick,
  onHover,
}: {
  choices: readonly Choice[];
  active: number;
  value: string | undefined;
  onPick: (choice: Choice) => void;
  onHover: (index: number) => void;
}) {
  if (choices.length === 0)
    return <div className="v-picker__empty">No models for this modality.</div>;
  return (
    <ul className="v-picker__list" role="listbox">
      {choices.map((choice, i) => (
        <li
          key={choice.key}
          role="option"
          className="v-picker__option"
          aria-selected={choice.value === value}
          data-active={i === active}
          onMouseEnter={() => onHover(i)}
          onMouseDown={(e) => {
            e.preventDefault();
            onPick(choice);
          }}
        >
          <span className="v-picker__current">
            <span className="v-picker__name">{choice.name}</span>
            {choice.model && <span className="v-picker__id">{choice.model.id}</span>}
          </span>
          {choice.model && <ModelMeta model={choice.model} />}
        </li>
      ))}
    </ul>
  );
}
