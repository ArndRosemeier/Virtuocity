import { premiseContract } from '@virtuocity/contract-premise';
import type { ChangeOptions, SkillContext } from '@virtuocity/core';

/** Sessions a premise is being delivered to, so joining twice opens the story once. */
const delivering = new WeakSet<object>();

/**
 * Opens the story with this actor's premise. The premise comes from whatever
 * skill of the actor implements the premise contract, so any kind of premise
 * (text, a picture, sound) can stand in. Does nothing once the story has begun.
 * A hidden premise is posted for the AI actors only, never for the people.
 */
export function deliverPremise(ctx: SkillContext, hidden: boolean): void {
  if (ctx.transcript.length > 0 || delivering.has(ctx.bus)) return;
  delivering.add(ctx.bus);
  ctx.startJob('Setting the premise', async () => {
    try {
      const { messages } = await ctx.invoke(ctx.actor.id, premiseContract, 'premise', {});
      const humans = ctx.actors.filter((a) => a.controller === 'human').map((a) => a.id);
      const options: ChangeOptions = hidden ? { hiddenFrom: humans } : {};
      for (const message of messages) await ctx.post(message, undefined, options);
    } finally {
      delivering.delete(ctx.bus);
    }
  });
}
