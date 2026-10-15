import {
  SESSION_FIGURES,
  SESSION_OUTLINE,
  sessionAnalyticsContract,
} from '@virtuocity/contract-analytics';
import type { StoryMarker } from '@virtuocity/contract-render';
import { markerContract } from '@virtuocity/contract-render';
import { spaceContract } from '@virtuocity/contract-space';
import type { Skill, SkillContext, Starter, VirtuocityModule } from '@virtuocity/core';
import { implement, jobEnded, messagePosted, readSettings } from '@virtuocity/core';
import { analyses } from './analysis';
import { sessionFigures } from './figures';
import { sessionOutline } from './outline';
import { sessionAnalyticsSettings } from './settings';

export * from './analysis';
export * from './figures';
export * from './outline';
export * from './settings';

/** Every marker the actors in the session place, e.g. a chronicler's "Summarized". */
async function markersOf(ctx: SkillContext): Promise<StoryMarker[]> {
  const placing = ctx.actors.filter((a) => ctx.serves(a.id, markerContract));
  const placed = await Promise.all(
    placing.map(async ({ id }) => {
      const { markers } = await ctx.invoke(id, markerContract, 'markers', {});
      return markers.map((m) => ({ ...m, actorId: id }));
    }),
  );
  return placed.flat();
}

/**
 * Analyses the session through whatever skill of this actor implements the
 * session-analytics contract, so any analysis can stand in, and keeps it for its space.
 */
async function refresh(ctx: SkillContext): Promise<void> {
  const { parts } = await ctx.invoke(ctx.actor.id, sessionAnalyticsContract, 'analyze', {});
  await analyses.keep(ctx, parts);
}

/**
 * Plain code, no model: shows how long the session is (posts, words,
 * characters, tokens, words per speaker, markers) and the session as an outline, one
 * thin line per post colored by what kind of post it is, with markers such as
 * "Summarized" in between; clicking a line brings that post into view. Picked by a person (or Retry in its space), it
 * updates right away; with `automatic` on, also after every new post and
 * finished background job.
 */
export const sessionAnalyticsSkill: Skill = {
  id: 'session-analytics',
  name: 'Session analytics',
  backing: 'code',
  settings: sessionAnalyticsSettings,
  implements: [
    implement(sessionAnalyticsContract, {
      analyze: async (_input, ctx) => {
        const markers = await markersOf(ctx);
        const outline = sessionOutline(ctx.transcript, ctx.actors, markers);
        const figures = sessionFigures(ctx.transcript, ctx.actors, markers);
        return {
          parts: [
            { kind: SESSION_FIGURES, data: figures },
            { kind: SESSION_OUTLINE, data: outline },
          ],
        };
      },
    }),
    implement(spaceContract, analyses.space(refresh)),
  ],
  onRequest: refresh,
  // A finished background job may have moved a marker, e.g. a new summary.
  listensTo: [messagePosted.type, jobEnded.type],
  onEvent: async (event, ctx) => {
    const { automatic } = readSettings(sessionAnalyticsSettings, ctx.settings);
    if (automatic && (messagePosted.is(event) || jobEnded.is(event))) await refresh(ctx);
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
