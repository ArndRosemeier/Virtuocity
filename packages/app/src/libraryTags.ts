import type { TagDef } from '@virtuocity/ui';

interface Named {
  readonly id: string;
  readonly name: string;
}

/** True when the item has every selected skill; no selection matches everything. */
export function hasSkills(skillIds: readonly string[], selected: readonly string[]): boolean {
  return selected.every((id) => skillIds.includes(id));
}

/** One tag per installed skill that at least one item uses, counting those items, by name. */
export function skillTags(
  skills: readonly Named[],
  items: readonly (readonly string[])[],
): TagDef[] {
  return skills
    .map((skill) => ({
      id: skill.id,
      label: skill.name,
      count: items.filter((ids) => ids.includes(skill.id)).length,
    }))
    .filter((tag) => tag.count > 0)
    .sort((a, b) => a.label.localeCompare(b.label));
}

/** The stored selection; anything that is not a list of strings counts as none. */
export function parseTags(text: string): string[] {
  try {
    const value: unknown = JSON.parse(text);
    return Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string') : [];
  } catch {
    return [];
  }
}
