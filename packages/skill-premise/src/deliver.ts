import { premiseContract } from '@virtuocity/contract-premise';
import type { ChangeOptions, SkillContext } from '@virtuocity/core';

/**
 * Opens the session with this actor's premise, as the actor is right now. The
 * premise comes from whatever skill of the actor implements the premise
 * contract, so any kind of premise (text, a picture, sound) can stand in.
 * A hidden premise is posted for the AI actors only, never for the people.
 */
export async function deliverPremise(ctx: SkillContext, hidden: boolean): Promise<void> {
  const { messages } = await ctx.invoke(ctx.actor.id, premiseContract, 'premise', {});
  const humans = ctx.actors.filter((a) => a.controller === 'human').map((a) => a.id);
  const options: ChangeOptions = hidden ? { hiddenFrom: humans } : {};
  for (const message of messages) await ctx.post(message, undefined, options);
}
