import type { Actor, OutputPart, messageSchema, z } from '@virtuocity/core';
import type { StoryMarker } from './marker';

/** A message as the render contract receives it. */
export type StoryMessage = z.output<typeof messageSchema>;

/**
 * Output kind of a chat-shaped view: messages in order, each under its
 * speaker's name. Its data is a `ChatView`. Shared by every renderer that
 * draws the story as a chat, so the app draws them all the same way.
 */
export const CHAT_VIEW = 'chat-view';

/** One message as the chat shows it: who said it, and what, drawn by its kind's renderer. */
export interface ChatEntry {
  readonly id: string;
  readonly actorId: string;
  readonly name: string;
  readonly human: boolean;
  readonly part: OutputPart;
  readonly stats?: StoryMessage['stats'];
  /** Markers placed after this message. */
  readonly markers?: readonly Omit<StoryMarker, 'afterId'>[];
}

export interface ChatView {
  readonly entries: readonly ChatEntry[];
}

/**
 * The story as a chat: every message in order, under its speaker's name.
 * `partOf` decides how each message is drawn; by default, as it is. Markers
 * go with the message they follow; ones after no shown message are left out.
 */
export function chatView(
  messages: readonly StoryMessage[],
  actors: readonly Actor[],
  partOf: (message: StoryMessage) => OutputPart = (m) => ({ kind: m.kind, data: m.data }),
  markers: readonly StoryMarker[] = [],
): ChatView {
  const actorOf = (id: string) => actors.find((a) => a.id === id);
  const markersAfter = (id: string) =>
    markers.filter((k) => k.afterId === id).map(({ actorId, label }) => ({ actorId, label }));
  return {
    entries: messages.map((m) => ({
      id: m.id,
      actorId: m.actorId,
      name: actorOf(m.actorId)?.personality.name ?? m.actorId,
      human: actorOf(m.actorId)?.controller === 'human',
      part: partOf(m),
      ...(m.stats ? { stats: m.stats } : {}),
      ...(markersAfter(m.id).length > 0 ? { markers: markersAfter(m.id) } : {}),
    })),
  };
}
