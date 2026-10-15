import type { Figure, FigureGroup, SessionFigures } from '@virtuocity/contract-analytics';
import type { StoryMarker } from '@virtuocity/contract-render';
import type { Actor, Message } from '@virtuocity/core';
import { IMAGE_PART, estimateTokens } from '@virtuocity/core';

const number = new Intl.NumberFormat('en-US');
const format = (n: number) => number.format(Math.round(n));

/** Words in a text, counting runs of letters, digits and marks between spaces. */
export const wordCount = (text: string) => text.split(/\s+/).filter((w) => w !== '').length;

/** Words each speaker wrote, most first. */
function wordsPerSpeaker(texts: readonly Message[], actors: readonly Actor[]): Figure[] {
  const words = new Map<string, number>();
  for (const m of texts) words.set(m.actorId, (words.get(m.actorId) ?? 0) + wordCount(m.text));
  const nameOf = (id: string) => actors.find((a) => a.id === id)?.personality.name ?? id;
  return [...words]
    .sort(([, a], [, b]) => b - a)
    .map(([id, n]) => ({ label: nameOf(id), value: format(n) }));
}

/** How many markers the actors placed: in all, and per label (e.g. Summarized). */
function markerCounts(markers: readonly StoryMarker[]): FigureGroup[] {
  if (markers.length === 0) return [];
  const byLabel = new Map<string, number>();
  for (const m of markers) byLabel.set(m.label, (byLabel.get(m.label) ?? 0) + 1);
  const labels = [...byLabel].map(([label, n]) => ({ label, value: format(n) }));
  return [
    { title: 'Markers', figures: [{ label: 'All', value: format(markers.length) }, ...labels] },
  ];
}

/**
 * How long the session is: posts, words and characters of its text posts,
 * the tokens a model reads for all of it (an estimate), words per speaker,
 * and how many markers (e.g. Summarized) actors placed.
 */
export function sessionFigures(
  messages: readonly Message[],
  actors: readonly Actor[],
  markers: readonly StoryMarker[] = [],
): SessionFigures {
  const texts = messages.filter((m) => m.kind === 'text');
  const words = texts.reduce((n, m) => n + wordCount(m.text), 0);
  const characters = texts.reduce((n, m) => n + m.text.length, 0);
  const pictures = messages.filter((m) => m.kind === IMAGE_PART).length;
  const tokens = estimateTokens(messages.map((m) => m.text).join('\n'));
  const session: Figure[] = [
    { label: 'Posts', value: format(messages.length) },
    { label: 'Words', value: format(words) },
    { label: 'Characters', value: format(characters) },
    { label: 'Tokens (estimate)', value: `≈ ${format(tokens)}` },
    { label: 'Words per text post', value: format(texts.length ? words / texts.length : 0) },
    ...(pictures > 0 ? [{ label: 'Pictures', value: format(pictures) }] : []),
  ];
  const speakers = wordsPerSpeaker(texts, actors);
  return {
    groups: [
      { title: 'Length', figures: session },
      ...(speakers.length > 0 ? [{ title: 'Words per speaker', figures: speakers }] : []),
      ...markerCounts(markers),
    ],
  };
}
