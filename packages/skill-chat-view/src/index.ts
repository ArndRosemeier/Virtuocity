import { CHAT_VIEW, chatView, renderContract } from '@virtuocity/contract-render';
import type { Actor, Skill, VirtuocityModule } from '@virtuocity/core';
import { implement } from '@virtuocity/core';

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

/** The standard story view, ready to draw any story. */
export const chatViewActor: Actor = {
  id: 'chat-view',
  controller: 'ai',
  personality: { name: 'Chat view', description: 'Shows the story as a chat.' },
  skillIds: [chatViewSkill.id],
};

export const chatViewModule: VirtuocityModule = {
  id: 'skill-chat-view',
  register: (host) => {
    host.contracts.register(renderContract);
    host.skills.register(chatViewSkill);
    host.actors.register(chatViewActor);
  },
};
