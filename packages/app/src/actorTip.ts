import type { Actor } from '@virtuocity/core';

/** Longest stretch of the description a tooltip shows. */
const MAX_DESCRIPTION = 160;

/** The description's first line, cut to fit a tooltip. */
function shortDescription(description: string): string {
  const line = description.trim().split('\n')[0]?.trim() ?? '';
  return line.length > MAX_DESCRIPTION ? `${line.slice(0, MAX_DESCRIPTION - 1).trimEnd()}…` : line;
}

/**
 * What an actor is, for a hover tooltip: who plays it, its skills by their
 * display names (`skillName` looks them up; unknown ids are skipped), and the
 * start of its description.
 */
export function actorTip(actor: Actor, skillName: (id: string) => string | undefined): string {
  const names = actor.skillIds.flatMap((id) => skillName(id) ?? []);
  const lines = [
    actor.controller === 'human'
      ? `${actor.personality.name} (played by a person)`
      : actor.personality.name,
    names.length > 0 ? `Skills: ${names.join(', ')}` : 'No skills',
  ];
  const description = shortDescription(actor.personality.description);
  if (description) lines.push(description);
  return lines.join('\n');
}
