import { SESSION_OUTLINE, sessionAnalyticsContract } from '@virtuocity/contract-analytics';
import { spaceContract } from '@virtuocity/contract-space';
import type { Skill, SkillContext, Starter, VirtuocityModule } from '@virtuocity/core';
import { implement, messagePosted, readSettings } from '@virtuocity/core';
import { analyses } from './analysis';
import { sessionOutline } from './outline';
import { sessionAnalyticsSettings } from './settings';

export * from './analysis';
export * from './outline';
export * from './settings';

/**
 * Analyses the session through whatever skill of this actor implements the
 * session-analytics contract, so any analysis can stand in, and keeps it for its space.
 */
async function refresh(ctx: SkillContext): Promise<void> {
  const { parts } = await ctx.invoke(ctx.actor.id, sessionAnalyticsContract, 'analyze', {});
  await analyses.keep(ctx, parts);
}

/**
 * Plain code, no model: shows the session in its space as an outline, one
 * thin line per post colored by what kind of post it is, and clicking a line
 * brings that post into view. Picked by a person (or Retry in its space), it
 * updates right away; with `automatic` on, also after every new post.
 */
export const sessionAnalyticsSkill: Skill = {
  id: 'session-analytics',
  name: 'Session analytics',
  backing: 'code',
  settings: sessionAnalyticsSettings,
  implements: [
    implement(sessionAnalyticsContract, {
      analyze: (_input, ctx) =>
        Promise.resolve({
          parts: [{ kind: SESSION_OUTLINE, data: sessionOutline(ctx.transcript, ctx.actors) }],
        }),
    }),
    implement(spaceContract, analyses.space(refresh)),
  ],
  onRequest: refresh,
  listensTo: [messagePosted.type],
  onEvent: async (event, ctx) => {
    const { automatic } = readSettings(sessionAnalyticsSettings, ctx.settings);
    if (automatic && messagePosted.is(event)) await refresh(ctx);
  },
};

/** An outline of the session's posts, offered on a fresh start. */
export const sessionAnalyticsStarter: Starter = {
  id: 'session-analytics',
  personality: {
    name: 'Analytics',
    description:
      'Shows the session as a strip of colored lines, one per post; click one to go there.',
  },
  needs: [sessionAnalyticsContract],
};

export const sessionAnalyticsModule: VirtuocityModule = {
  id: 'skill-session-analytics',
  register: (host) => {
    host.contracts.register(sessionAnalyticsContract);
    host.contracts.register(spaceContract);
    host.docTypes.register(analyses.doc);
    host.skills.register(sessionAnalyticsSkill);
    host.starters.register(sessionAnalyticsStarter);
  },
};
