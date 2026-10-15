import type { OutlineRow, PostType, SessionOutline } from '@virtuocity/contract-analytics';
import { POST_TYPE_NAMES } from '@virtuocity/contract-analytics';
import type { StoryMarker } from '@virtuocity/contract-render';
import type { Actor, Message } from '@virtuocity/core';
import { AUDIO_PART, IMAGE_PART, TOOL_USE } from '@virtuocity/core';

const BY_KIND: Readonly<Record<string, PostType>> = {
  [IMAGE_PART]: 'picture',
  [AUDIO_PART]: 'sound',
  [TOOL_USE]: 'tool',
};

/** What kind of post a message is: hidden from the people, by its kind, or by who wrote it. */
export function postType(message: Message, actors: readonly Actor[]): PostType {
  const people = actors.filter((a) => a.controller === 'human').map((a) => a.id);
  if (message.hiddenFrom?.some((id) => people.includes(id))) return 'hidden';
  const byKind = BY_KIND[message.kind];
  if (byKind) return byKind;
  if (message.kind !== 'text') return 'other';
  const human = actors.find((a) => a.id === message.actorId)?.controller === 'human';
  return human ? 'person' : 'ai';
}

/**
 * One line per post, in order, saying who posted what kind of thing, each
 * followed by the markers placed after it (e.g. a chronicler's "Summarized").
 */
export function sessionOutline(
  messages: readonly Message[],
  actors: readonly Actor[],
  markers: readonly StoryMarker[] = [],
): SessionOutline {
  const nameOf = (id: string) => actors.find((a) => a.id === id)?.personality.name ?? id;
  const rows = messages.flatMap((m): OutlineRow[] => {
    const type = postType(m, actors);
    const post = {
      messageId: m.id,
      type,
      title: `${nameOf(m.actorId)} · ${POST_TYPE_NAMES[type]}`,
    };
    const after = markers
      .filter((k) => k.afterId === m.id)
      .map((k): OutlineRow => ({
        messageId: m.id,
        type: 'marker',
        title: `${nameOf(k.actorId)} · ${k.label}`,
        markerOf: k.actorId,
      }));
    return [post, ...after];
  });
  return { rows };
}
