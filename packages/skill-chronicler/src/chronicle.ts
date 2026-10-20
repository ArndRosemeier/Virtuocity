import { summarizerContract } from '@virtuocity/contract-memory';
import type { SkillContext } from '@virtuocity/core';
import { readSettings } from '@virtuocity/core';
import { linesToCover, storyLines } from './lines';
import { MEMORY, chronicles, memoryDoc } from './memory';
import { chroniclerSettings } from './settings';

/** Chroniclers with an update running, so a busy story doesn't start a second one. */
const busy = new Set<string>();

/**
 * Brings the chronicler's summary up to date when enough story has built up.
 * The summary comes from whatever skill of this actor implements the
 * summarizer contract, so any summarizer can stand in.
 */
export function chronicle(ctx: SkillContext): void {
  const settings = readSettings(chroniclerSettings, ctx.settings);
  const previous = chronicles(ctx.state)[ctx.actor.id];
  const story = ctx.transcript.filter((m) => m.actorId !== ctx.actor.id);
  const lines = linesToCover(storyLines(story, ctx.everyone), settings, previous?.upTo);
  const last = lines?.at(-1);
  if (!lines || !last || busy.has(ctx.actor.id)) return;
  busy.add(ctx.actor.id);
  ctx.startJob('Updating the story so far', async () => {
    try {
      const { summary } = await ctx.invoke(ctx.actor.id, summarizerContract, 'summarize', {
        lines,
        ...(previous ? { previous: { summary: previous.summary, upTo: previous.upTo } } : {}),
      });
      await ctx.state.change(MEMORY, memoryDoc, {
        type: 'set',
        chroniclerId: ctx.actor.id,
        summary,
        upTo: last.id,
      });
    } finally {
      busy.delete(ctx.actor.id);
    }
  });
}
