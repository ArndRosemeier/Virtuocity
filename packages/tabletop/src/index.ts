import { speakerContract } from '@virtuocity/contract-speaker';
import { directorContract } from '@virtuocity/contract-director';
import { summarizerContract } from '@virtuocity/contract-memory';
import { premiseContract } from '@virtuocity/contract-premise';
import {
  dnd5eGmContract,
  dnd5ePlayerContract,
  pf2eGmContract,
  pf2ePlayerContract,
  tabletopContracts,
} from '@virtuocity/contract-tabletop';
import { illustratorContract } from '@virtuocity/contract-visual';
import { sessionTypeContract } from '@virtuocity/core';
import type { Contract, Starter, VirtuocityModule } from '@virtuocity/core';

/** The roles every table has besides the game master and the players. */
const SUPPORT_ROLES = [
  {
    label: 'An adventure',
    question: 'What adventure do you play?',
    hint: 'Opens the game with a starting situation. It can stay hidden from you.',
    needs: [premiseContract.id],
    importance: 'recommended',
    without: 'The game master improvises a start, which tends to be generic.',
  },
  {
    label: 'A director',
    question: 'Who passes the turn around the table?',
    hint: 'Picks who speaks next: usually the game master after you act, a player when addressed or in initiative order.',
    needs: [directorContract.id],
    importance: 'recommended',
    without: 'After each of your moves you click whether the game master or a player speaks.',
  },
  {
    label: 'A chronicler',
    question: 'Who keeps track of a long campaign?',
    hint: 'Keeps a summary so long games stay coherent.',
    needs: [summarizerContract.id],
    importance: 'recommended',
    without:
      'Every turn sends the whole game to the models: long campaigns get expensive and can overflow small models.',
  },
  {
    label: 'An illustrator',
    question: 'Who paints pictures of the game?',
    hint: 'Paints scenes as the game goes.',
    needs: [illustratorContract.id],
    importance: 'optional',
    without: 'The game is text only.',
  },
];

/**
 * A tabletop session type for one game system: an AI game master runs the
 * game by its rules, AI players and you play characters, and dice are rolled
 * for real by the GM and player skills.
 */
function tableType(id: string, name: string, gm: Contract, player: Contract): Starter {
  return {
    id,
    personality: {
      name,
      description: `A ${name} game: a game master runs it by the rules and rolls real dice; you play along with AI players or alone.`,
    },
    needs: [sessionTypeContract],
    settings: {
      'session-type': {
        castContracts: [speakerContract.id],
        roles: [
          {
            label: 'A game master',
            question: 'Who runs the game?',
            hint: `Talks. Knows the ${name} rules, describes the world, plays everyone else and rolls the dice.`,
            cast: true,
            needs: [gm.id],
            importance: 'needed',
            without: 'Nobody runs the world: you would be the game master yourself.',
          },
          {
            label: 'Players',
            question: 'Who plays at the table with you?',
            hint: 'Talk. AI players, each playing one character; add one, several or none.',
            cast: true,
            needs: [player.id],
            importance: 'recommended',
            without: 'Only you and the game master: a solo adventure.',
          },
          ...SUPPORT_ROLES,
        ],
        panels: ['spaces', 'story', 'composer', 'cast', 'tasks', 'jobs'],
      },
    },
  };
}

export const pf2eType = tableType(
  'pathfinder-2e',
  'Pathfinder 2e',
  pf2eGmContract,
  pf2ePlayerContract,
);
export const dnd5eType = tableType('dnd-5e', 'D&D 5e', dnd5eGmContract, dnd5ePlayerContract);

/** The game masters and a player character for each system, offered on a fresh start. */
export const tabletopStarters: readonly Starter[] = [
  {
    id: 'pf2e-game-master',
    personality: {
      name: 'Game Master',
      description:
        'Runs Pathfinder games with a light touch: vivid but short descriptions, fair rulings by the book, and tense, tactical fights.',
    },
    speaks: true,
    needs: [pf2eGmContract],
  },
  {
    id: 'pf2e-kira',
    personality: {
      name: 'Kira',
      description:
        'Kira Venn, human fighter, level 1. Str +4, Dex +2, Con +2, Int +0, Wis +1, Cha +0. HP 20, AC 18 (chain mail), Perception +6, Fortitude +7, Reflex +7, Will +4. Longsword +9 (1d8+4 slashing), shortbow +7 (1d6 piercing). Athletics +7, Intimidation +3, Survival +4. Reactive Strike. Blunt, loyal, distrusts magic, first into every fight.',
    },
    speaks: true,
    needs: [pf2ePlayerContract],
  },
  {
    id: 'dnd5e-dungeon-master',
    personality: {
      name: 'Dungeon Master',
      description:
        'Runs D&D games with warmth and wit: vivid but short descriptions, fair rulings by the book, and room for every player to shine.',
    },
    speaks: true,
    needs: [dnd5eGmContract],
  },
  {
    id: 'dnd5e-bram',
    personality: {
      name: 'Bram',
      description:
        "Bram Tallow, lightfoot halfling rogue, level 1. Str 8, Dex 17, Con 14, Int 12, Wis 10, Cha 13. HP 10, AC 14 (leather), speed 25 ft, proficiency +2. Rapier +5 (1d8+3 piercing), shortbow +5 (1d6+3), Sneak Attack 1d6. Stealth +7 and Sleight of Hand +7 (expertise), Acrobatics +5, Perception +2, Persuasion +3, thieves' tools +5. Lucky (reroll natural 1s). Cheerful, curious, pockets things that aren't his.",
    },
    speaks: true,
    needs: [dnd5ePlayerContract],
  },
];

export const tabletopModule: VirtuocityModule = {
  id: 'tabletop',
  register: (host) => {
    host.contracts.register(sessionTypeContract);
    [directorContract, summarizerContract, premiseContract, illustratorContract].forEach((c) =>
      host.contracts.register(c),
    );
    tabletopContracts.forEach((c) => host.contracts.register(c));
    [pf2eType, dnd5eType, ...tabletopStarters].forEach((s) => host.starters.register(s));
  },
};
