import { diceRollerContract } from '@virtuocity/contract-dice';
import type { Skill, VirtuocityModule } from '@virtuocity/core';
import { defineEvent, implement } from '@virtuocity/core';
import type { DiceRoll } from './dice';
import { roll } from './dice';

export * from './dice';

/** Emit this to request a roll; the dice skill answers with `diceRolled`. */
export const diceRequested = defineEvent<{ readonly notation: string }>('dice.requested');
export const diceRolled = defineEvent<DiceRoll>('dice.rolled');

/** A pure code skill: no LLM involved. `random` is injectable for tests. */
export function createDiceSkill(random: () => number = Math.random): Skill {
  return {
    id: 'dice',
    name: 'Dice roller',
    backing: 'code',
    implements: [
      implement(diceRollerContract, {
        roll: ({ notation }) => Promise.resolve(roll(notation, random)),
      }),
    ],
    listensTo: [diceRequested.type],
    async onEvent(event, ctx) {
      if (!diceRequested.is(event)) return;
      await ctx.bus.emit(diceRolled.create(roll(event.payload.notation, random), ctx.actor.id));
    },
  };
}

export const diceSkill = createDiceSkill();

export const diceModule: VirtuocityModule = {
  id: 'skill-dice',
  register: (host) => {
    host.contracts.register(diceRollerContract);
    host.skills.register(diceSkill);
  },
};
