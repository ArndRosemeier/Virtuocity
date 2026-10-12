import { renderContract } from '@virtuocity/contract-render';
import type { Actor, OutputPart, Skill, VirtuocityModule } from '@virtuocity/core';
import type { messageSchema, z } from '@virtuocity/core';
import { implement } from '@virtuocity/core';

type StoryMessage = z.output<typeof messageSchema>;

/** Output kind of the chat view. Its data is a `ChatView`. */
export const CHAT_VIEW = 'chat-view';

/** One message as the chat shows it: who said it, and what, drawn by its kind's renderer. */
export interface ChatEntry {
  readonly id: string;
  readonly actorId: string;
  readonly name: string;
  readonly human: boolean;
  readonly part: OutputPart;
  readonly stats?: StoryMessage['stats'];
}

export interface ChatView {
  readonly entries: readonly ChatEntry[];
}

/** The story as a chat: every message in order, under its speaker's name. */
export function chatView(messages: readonly StoryMessage[], actors: readonly Actor[]): ChatView {
  const actorOf = (id: string) => actors.find((a) => a.id === id);
  return {
    entries: messages.map((m) => ({
      id: m.id,
      actorId: m.actorId,
      name: actorOf(m.actorId)?.personality.name ?? m.actorId,
      human: actorOf(m.actorId)?.controller === 'human',
      part: { kind: m.kind, data: m.data },
      ...(m.stats ? { stats: m.stats } : {}),
    })),
  };
}

/** The standard renderer: shows the story as a chat. */
export const chatViewSkill: Skill = {
  id: 'chat-view',
  name: 'Chat view',
  backing: 'code',
  implements: [
    implement(renderContract, {
      render: ({ messages }, ctx) =>
        Promise.resolve({ parts: [{ kind: CHAT_VIEW, data: chatView(messages, ctx.actors) }] }),
    }),
  ],
};

export const chatViewModule: VirtuocityModule = {
  id: 'skill-chat-view',
  register: (host) => {
    host.contracts.register(renderContract);
    host.skills.register(chatViewSkill);
  },
};
