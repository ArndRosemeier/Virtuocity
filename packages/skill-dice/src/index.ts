import type { Skill, VirtuocityModule } from '@virtuocity/core';
import { defineEvent } from '@virtuocity/core';
import type { DiceRoll } from './dice';
import { roll } from './dice';

export * from './dice';

/** Emit this to request a roll; the dice skill answers with `diceRolled`. */
export const diceRequested = defineEvent<{ readonly notation: string }>('dice.requested');
export const diceRolled = defineEvent<DiceRoll>('dice.rolled');

/** A pure code skill: no LLM involved. */
export const diceSkill: Skill = {
  id: 'dice',
  name: 'Dice roller',
  backing: 'code',
  listensTo: [diceRequested.type],
  async onEvent(event, ctx) {
    if (!diceRequested.is(event)) return;
    await ctx.bus.emit(diceRolled.create(roll(event.payload.notation), ctx.actor.id));
  },
};

export const diceModule: VirtuocityModule = {
  id: 'skill-dice',
  register: (host) => host.skills.register(diceSkill),
};
