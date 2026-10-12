import { CHAT_VIEW, chatView, renderContract } from '@virtuocity/contract-render';
import type { Actor, Skill, VirtuocityModule } from '@virtuocity/core';
import { implement } from '@virtuocity/core';
import { richText } from './document';
import { RICH_TEXT } from './rich-text';

export * from './document';
export * from './rich-text';

/**
 * Shows the story as a chat whose text is formatted: markdown, direct speech
 * highlighted, and every XML element foldable, with `<hidden>` notes folded.
 */
export const roleplayViewSkill: Skill = {
  id: 'roleplay-view',
  name: 'Roleplay view',
  backing: 'code',
  implements: [
    implement(renderContract, {
      render: ({ messages }, ctx) => {
        const view = chatView(messages, ctx.actors, (m) =>
          m.kind === 'text'
            ? { kind: RICH_TEXT, data: richText(m.text) }
            : { kind: m.kind, data: m.data },
        );
        return Promise.resolve({ parts: [{ kind: CHAT_VIEW, data: view }] });
      },
    }),
  ],
};

/** What the Roleplay renderer tells every actor that uses a text model. */
export const ROLEPLAY_PROMPT = `You can use <hidden>...</hidden> tags to maintain internal notes, track important details, plan future events, or record information that you need to remember. The player cannot see content within <hidden> tags, so use them freely for your planning and consistency tracking. In fact, whenever you introduce something new (a new character for example), provide details and plans about it in a hidden section for consistency.

You can use markdowns for highlighting.`;

/**
 * A story view that also sets the rules it draws: a system prompt telling the
 * models about hidden notes and markdown, and the Roleplay view drawing them.
 */
export const roleplayRendererActor: Actor = {
  id: 'roleplay-renderer',
  controller: 'ai',
  personality: {
    name: 'Roleplay renderer',
    description: 'Lets actors keep hidden notes and use markdown, and draws both.',
  },
  skillIds: ['system-prompt', roleplayViewSkill.id],
  settings: { 'system-prompt': { prompt: ROLEPLAY_PROMPT } },
};

export const roleplayViewModule: VirtuocityModule = {
  id: 'skill-roleplay-view',
  register: (host) => {
    host.skills.register(roleplayViewSkill);
    host.actors.register(roleplayRendererActor);
  },
};
