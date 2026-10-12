import { premiseContract } from '@virtuocity/contract-premise';
import type { SkillContext } from '@virtuocity/core';

/**
 * Opens the story with this actor's premise. The premise comes from whatever
 * skill of the actor implements the premise contract, so any kind of premise
 * (text, a picture, sound) can stand in. Does nothing once the story has begun.
 */
export function deliverPremise(ctx: SkillContext): void {
  if (ctx.transcript.length > 0) return;
  ctx.startJob('Setting the premise', async () => {
    const { parts } = await ctx.invoke(ctx.actor.id, premiseContract, 'premise', {});
    await ctx.post(parts);
  });
}
