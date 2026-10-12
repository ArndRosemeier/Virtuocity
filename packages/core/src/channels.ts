import { z } from 'zod';
import { defineDocType } from './doc-type';
import type { OutputPart } from './output';
import type { Identified } from './registry';
import type { StateView } from './workspace';

/**
 * A continuous output: something that is always showing or playing, like the
 * current scene picture or background music, rather than a message in the
 * story. Each channel shows its latest content until it is replaced.
 */
export interface Channel extends Identified {
  readonly title: string;
  readonly description: string;
  /** Output part kinds the channel can show, e.g. `image` or `audio`. */
  readonly accepts: readonly string[];
}

export function defineChannel(channel: Channel): Channel {
  if (!/^[a-z][a-z0-9-]*$/.test(channel.id)) throw new Error(`Invalid channel id "${channel.id}"`);
  return channel;
}

/** What a channel shows now, and who put it there. */
export interface ChannelContent {
  readonly part: OutputPart;
  readonly actorId: string;
  readonly at: number;
}

export interface ChannelsState {
  readonly channels: Readonly<Record<string, ChannelContent>>;
}

export type ChannelOp =
  | { readonly type: 'show'; readonly channelId: string; readonly part: OutputPart }
  | { readonly type: 'clear'; readonly channelId: string };

/** The content of every channel. In the log, so it rewinds, branches and saves with the story. */
export const channelsDoc = defineDocType<ChannelsState, ChannelOp>({
  id: 'channels',
  version: 1,
  description: 'What each continuous output channel shows now.',
  op: z.discriminatedUnion('type', [
    z.object({
      type: z.literal('show'),
      channelId: z.string(),
      part: z.object({ kind: z.string(), data: z.unknown() }),
    }),
    z.object({ type: z.literal('clear'), channelId: z.string() }),
  ]),
  initial: () => ({ channels: {} }),
  apply: (state, op, meta) => {
    const rest = Object.fromEntries(
      Object.entries(state.channels).filter(([id]) => id !== op.channelId),
    );
    if (op.type === 'clear') return { channels: rest };
    const content = { part: op.part, actorId: meta.actorId, at: meta.at };
    return { channels: { ...rest, [op.channelId]: content } };
  },
});

/** The document id of a session's channels. */
export const CHANNELS = 'channels';

/** Shows `part` on a channel, replacing what it showed; the channel must accept the part's kind. */
export async function showOnChannel(
  state: StateView,
  channel: Channel,
  part: OutputPart,
): Promise<void> {
  if (!channel.accepts.includes(part.kind)) {
    throw new Error(`Channel "${channel.id}" cannot show "${part.kind}"`);
  }
  await state.change(CHANNELS, channelsDoc, { type: 'show', channelId: channel.id, part });
}

/** Everything the channels show now, as `state` may see it. */
export function channelContents(state: Pick<StateView, 'read'>): ChannelsState['channels'] {
  return state.read(CHANNELS, channelsDoc).channels;
}
