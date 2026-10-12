import { premiseContract } from '@virtuocity/contract-premise';
import type { SkillContext } from '@virtuocity/core';

/** Sessions a premise is being delivered to, so joining twice opens the story once. */
const delivering = new WeakSet<object>();

/**
 * Opens the story with this actor's premise. The premise comes from whatever
 * skill of the actor implements the premise contract, so any kind of premise
 * (text, a picture, sound) can stand in. Does nothing once the story has begun.
 */
export function deliverPremise(ctx: SkillContext): void {
  if (ctx.transcript.length > 0 || delivering.has(ctx.bus)) return;
  delivering.add(ctx.bus);
  ctx.startJob('Setting the premise', async () => {
    try {
      const { messages } = await ctx.invoke(ctx.actor.id, premiseContract, 'premise', {});
      for (const message of messages) await ctx.post(message);
    } finally {
      delivering.delete(ctx.bus);
    }
  });
}
