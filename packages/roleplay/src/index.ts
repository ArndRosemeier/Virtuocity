import { speakerContract } from '@virtuocity/contract-speaker';
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
      castContracts: [speakerContract.id],
      roles: [
        {
          label: 'A narrator',
          question: 'Who tells the story?',
          hint: 'Talks. Describes the world and what happens; the usual start.',
          cast: true,
          importance: 'needed',
          without: 'Nobody answers you: the story stands still.',
        },
        {
          label: 'A premise',
          question: 'How should the story begin?',
          hint: 'Opens an empty story with a starting situation. It can stay hidden from you.',
          needs: [premiseContract.id],
          importance: 'recommended',
          without: 'The narrator invents a start, which tends to be generic.',
        },
        {
          label: 'A director',
          question: 'Who decides whose turn it is?',
          hint: 'Picks who speaks after you act or pass.',
          needs: [directorContract.id],
          importance: 'recommended',
          without: 'You click who speaks after each of your moves.',
        },
        {
          label: 'A chronicler',
          question: 'Who keeps track of a long story?',
          hint: 'Keeps a summary so long stories stay coherent.',
          needs: [summarizerContract.id],
          importance: 'recommended',
          without:
            'Every turn sends the whole story to the models: long stories get expensive and can overflow small models.',
        },
        {
          label: 'AI players',
          question: 'Who plays along with you?',
          hint: 'Talk. Characters who play along with you; add one, several or none.',
          cast: true,
          importance: 'optional',
          without: 'Only you and the narrator: a solo adventure.',
        },
        {
          label: 'An illustrator',
          question: 'Who paints pictures of the story?',
          hint: 'Paints pictures of the story as it goes.',
          needs: [illustratorContract.id],
          importance: 'optional',
          without: 'The story is text only.',
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
