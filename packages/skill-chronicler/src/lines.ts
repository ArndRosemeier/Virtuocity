import type { StoryLine } from '@virtuocity/contract-memory';
import type { Actor, Message } from '@virtuocity/core';
import { estimateTokens, fitNewest, textOf } from '@virtuocity/core';
import type { ChroniclerSettings } from './settings';

/** The story as lines of text, with speaker names; messages without text are left out. */
export function storyLines(transcript: readonly Message[], actors: readonly Actor[]): StoryLine[] {
  const nameOf = (id: string) => actors.find((a) => a.id === id)?.personality.name ?? id;
  return transcript.flatMap((m) => {
    const text = textOf(m);
    return text ? [{ id: m.id, speaker: nameOf(m.actorId), text }] : [];
  });
}

/**
 * The lines a summary should cover now, or `undefined` when it is not time
 * yet. The newest `keepRecent` tokens stay out, since actors still read them; the
 * summary is updated once `updateAfter` tokens of older story are not in it.
 */
export function linesToCover(
  lines: readonly StoryLine[],
  settings: Pick<ChroniclerSettings, 'keepRecent' | 'updateAfter'>,
  coveredUpTo?: string,
  estimate: (text: string) => number = estimateTokens,
): StoryLine[] | undefined {
  const cost = (line: StoryLine) => estimate(`${line.speaker}: ${line.text}`);
  const older = lines.slice(0, lines.length - fitNewest(lines, settings.keepRecent, cost).length);
  const covered = coveredUpTo === undefined ? -1 : lines.findIndex((l) => l.id === coveredUpTo);
  const uncovered = older.slice(covered + 1);
  const tokens = uncovered.reduce((sum, line) => sum + cost(line), 0);
  return uncovered.length > 0 && tokens >= settings.updateAfter ? older : undefined;
}
