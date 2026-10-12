import { cx } from './cx';

export interface TagDef {
  readonly id: string;
  readonly label: string;
  /** How many items carry the tag, shown next to the label. */
  readonly count?: number;
}

/** Toggleable tags for filtering a list; an empty selection means no filter. */
export function TagPicker({
  tags,
  selected,
  onChange,
  label,
}: {
  tags: readonly TagDef[];
  selected: readonly string[];
  onChange: (next: readonly string[]) => void;
  label: string;
}) {
  const toggle = (id: string) =>
    onChange(selected.includes(id) ? selected.filter((s) => s !== id) : [...selected, id]);
  return (
    <div className="v-tags" role="group" aria-label={label}>
      {tags.map((tag) => (
        <button
          key={tag.id}
          type="button"
          className={cx('v-tag', selected.includes(tag.id) && 'v-tag--on')}
          aria-pressed={selected.includes(tag.id)}
          onClick={() => toggle(tag.id)}
        >
          {tag.label}
          {tag.count !== undefined && <span className="v-tag__count">{tag.count}</span>}
        </button>
      ))}
      {selected.length > 0 && (
        <button type="button" className="v-tag v-tag--clear" onClick={() => onChange([])}>
          Clear
        </button>
      )}
    </div>
  );
}
