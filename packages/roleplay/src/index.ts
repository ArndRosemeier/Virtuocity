import { directorContract } from '@virtuocity/contract-director';
import { summarizerContract } from '@virtuocity/contract-memory';
import { premiseContract } from '@virtuocity/contract-premise';
import { illustratorContract } from '@virtuocity/contract-visual';
import { sessionTypeContract } from '@virtuocity/core';
import type { Starter, VirtuocityModule } from '@virtuocity/core';

/** The Roleplay session type: how such a session looks and which roles its guide suggests. */
export const roleplayType: Starter = {
  id: 'roleplay',
  personality: {
    name: 'Roleplay',
    description:
      'A narrator tells the story with you. Add AI players, a premise, pictures or a chronicler if you like.',
  },
  needs: [sessionTypeContract],
  settings: {
    'session-type': {
      castSkills: ['conversation'],
      roles: [
        {
          label: 'A premise',
          hint: 'Opens an empty story with a starting situation.',
          needs: [premiseContract.id],
          optional: true,
        },
        {
          label: 'A narrator',
          hint: 'Talks. Describes the world and what happens; the usual start.',
          cast: true,
        },
        {
          label: 'A director',
          hint: 'Picks who speaks after you act or pass. Without one, you click who speaks.',
          needs: [directorContract.id],
          optional: true,
        },
        {
          label: 'AI players',
          hint: 'Talk. Characters who play along with you; add one, several or none.',
          cast: true,
          optional: true,
        },
        {
          label: 'An illustrator',
          hint: 'Paints pictures of the story as it goes.',
          needs: [illustratorContract.id],
          optional: true,
        },
        {
          label: 'A chronicler',
          hint: 'Keeps a summary so long stories stay coherent.',
          needs: [summarizerContract.id],
          optional: true,
        },
      ],
      panels: ['spaces', 'story', 'composer', 'cast', 'tasks', 'jobs'],
    },
  },
};

/** The actors a roleplay usually casts, offered in the library on a fresh start. */
export const roleplayStarters: readonly Starter[] = [
  { id: 'premise', personality: { name: 'Premise', description: '' }, needs: [premiseContract] },
  {
    id: 'narrator',
    personality: {
      name: 'Narrator',
      description:
        'Describes the world, its people and what happens next, in second person. Never decides what the player does.',
    },
    speaks: true,
  },
  {
    id: 'director',
    personality: {
      name: 'Director',
      description:
        'Keeps the story moving. After the player acts, the narrator usually answers; a character answers when addressed. Hands the turn back to the player when it is their move.',
    },
    needs: [directorContract],
  },
  {
    id: 'companion',
    personality: {
      name: 'Wren',
      description: 'A quick-witted traveller with a soft spot for strays and a habit of humming.',
    },
    speaks: true,
  },
  {
    id: 'illustrator',
    personality: { name: 'Ink', description: '' },
    settings: { illustrator: { style: 'Loose, warm watercolour' } },
    needs: [illustratorContract],
  },
  {
    id: 'chronicler',
    personality: { name: 'Chronicler', description: '' },
    needs: [summarizerContract],
  },
];

export const roleplayModule: VirtuocityModule = {
  id: 'roleplay',
  register: (host) => {
    host.contracts.register(illustratorContract);
    host.contracts.register(summarizerContract);
    host.contracts.register(premiseContract);
    host.contracts.register(directorContract);
    host.contracts.register(sessionTypeContract);
    [roleplayType, ...roleplayStarters].forEach((s) => host.starters.register(s));
  },
};
