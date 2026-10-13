import {
  dnd5eGmContract,
  dnd5ePlayerContract,
  pf2eGmContract,
  pf2ePlayerContract,
  tabletopContracts,
} from '@virtuocity/contract-tabletop';
import type { Skill, SkillContext, VirtuocityModule } from '@virtuocity/core';
import { defineSettings, implement, instructionsContract, readSettings, z } from '@virtuocity/core';
import { dnd5e } from './dnd5e';
import { DND5E_RULES } from './dnd5eRules';
import type { GameSystem } from './engine';
import { rollCheck } from './engine';
import { pf2e } from './pf2e';
import { PF2E_RULES } from './pf2eRules';
import { GM_ROLE, PLAYER_ROLE, tableInstructions } from './roles';

export * from './dnd5e';
export * from './engine';
export * from './pf2e';
export { tableInstructions } from './roles';

export const tabletopSettings = defineSettings({
  houseRules: z
    .string()
    .max(10000)
    .default('')
    .describe('House rules and variants this table plays with; they win over the rules'),
});

interface TableSeat {
  readonly id: string;
  readonly name: string;
  /** The seat's contract; every seat's has the same actions. */
  readonly contract: typeof pf2eGmContract;
  readonly system: GameSystem;
  readonly rules: string;
  readonly role: string;
}

/** The seat's rules, for its own actor's model calls only; others get nothing. */
function instructions(seat: TableSeat, actorId: string, ctx: SkillContext) {
  if (actorId !== ctx.actor.id) return Promise.resolve({ text: '' });
  const { houseRules } = readSettings(tabletopSettings, ctx.settings);
  return Promise.resolve({ text: tableInstructions(seat.role, seat.rules, houseRules) });
}

/**
 * A seat at a tabletop game: a talking actor with this skill knows the game
 * system's rules and its part at the table (as instructions for its own
 * calls), and rolls checks, sets DCs and works out proficiency as tools.
 */
function seatSkill(seat: TableSeat, random: () => number): Skill {
  const { system } = seat;
  return {
    id: seat.id,
    name: seat.name,
    backing: 'code',
    settings: tabletopSettings,
    implements: [
      implement(seat.contract, {
        check: (input) => Promise.resolve(rollCheck(system, input, random)),
        difficulty: ({ difficulty, level }) =>
          Promise.resolve({ dc: system.difficulty(difficulty, level) }),
        proficiency: ({ level, rank }) =>
          Promise.resolve({ bonus: system.proficiency(level, rank) }),
      }),
      implement(instructionsContract, {
        instructions: ({ actorId }, ctx) => instructions(seat, actorId, ctx),
      }),
    ],
  };
}

const SEATS: readonly TableSeat[] = [
  {
    id: 'pf2e-gm',
    name: 'PF2E GM',
    contract: pf2eGmContract,
    system: pf2e,
    rules: PF2E_RULES,
    role: GM_ROLE,
  },
  {
    id: 'pf2e-player',
    name: 'PF2E Player',
    contract: pf2ePlayerContract,
    system: pf2e,
    rules: PF2E_RULES,
    role: PLAYER_ROLE,
  },
  {
    id: 'dnd5e-gm',
    name: 'D&D 5 classic GM',
    contract: dnd5eGmContract,
    system: dnd5e,
    rules: DND5E_RULES,
    role: GM_ROLE,
  },
  {
    id: 'dnd5e-player',
    name: 'D&D 5 classic Player',
    contract: dnd5ePlayerContract,
    system: dnd5e,
    rules: DND5E_RULES,
    role: PLAYER_ROLE,
  },
];

/** The four seats; `random` is like Math.random, injectable for tests. */
export function createTabletopSkills(random: () => number = Math.random): Skill[] {
  return SEATS.map((seat) => seatSkill(seat, random));
}

export const tabletopModule: VirtuocityModule = {
  id: 'skill-tabletop',
  register: (host) => {
    host.contracts.register(instructionsContract);
    tabletopContracts.forEach((c) => host.contracts.register(c));
    createTabletopSkills().forEach((s) => host.skills.register(s));
  },
};
