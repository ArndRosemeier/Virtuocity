import { directorContract } from '@virtuocity/contract-director';
import { summarizerContract } from '@virtuocity/contract-memory';
import { premiseContract } from '@virtuocity/contract-premise';
import { illustratorContract } from '@virtuocity/contract-visual';
import type { VirtuocityModule } from '@virtuocity/core';
import { defineBlueprint } from '@virtuocity/core';

/**
 * A narrator tells a story with you. Options: AI players, a director that
 * picks who speaks, a premise that opens it, an illustrator that paints it and
 * a chronicler that remembers it. The
 * personalities are the default actors offered in the library.
 */
export const roleplayBlueprint = defineBlueprint({
  id: 'roleplay',
  name: 'Roleplay',
  description:
    'A narrator tells the story with you. Add AI players, a premise, pictures or a chronicler if you like.',
  roles: [
    {
      id: 'premise',
      label: 'A premise',
      hint: 'Opens an empty story with a starting situation.',
      personality: { name: 'Premise', description: '' },
      needs: [premiseContract],
      optional: true,
    },
    {
      id: 'narrator',
      label: 'A narrator',
      hint: 'Talks. Describes the world and what happens; the usual start.',
      personality: {
        name: 'Narrator',
        description:
          'Describes the world, its people and what happens next, in second person. Never decides what the player does.',
      },
      speaks: true,
    },
    {
      id: 'director',
      label: 'A director',
      hint: 'Picks who speaks after you act or pass. Without one, you click who speaks.',
      personality: {
        name: 'Director',
        description:
          'Keeps the story moving. After the player acts, the narrator usually answers; a character answers when addressed. Hands the turn back to the player when it is their move.',
      },
      needs: [directorContract],
      optional: true,
    },
    {
      id: 'companion',
      label: 'AI players',
      hint: 'Talk. Characters who play along with you; add one, several or none.',
      personality: {
        name: 'Wren',
        description: 'A quick-witted traveller with a soft spot for strays and a habit of humming.',
      },
      speaks: true,
      optional: true,
    },
    {
      id: 'illustrator',
      label: 'An illustrator',
      hint: 'Paints pictures of the story as it goes.',
      personality: { name: 'Ink', description: '' },
      settings: { illustrator: { style: 'Loose, warm watercolour' } },
      needs: [illustratorContract],
      optional: true,
    },
    {
      id: 'chronicler',
      label: 'A chronicler',
      hint: 'Keeps a summary so long stories stay coherent.',
      personality: {
        name: 'Chronicler',
        description: '',
      },
      needs: [summarizerContract],
      optional: true,
    },
  ],
  layout: {
    left: ['spaces'],
    main: ['story'],
    input: ['composer'],
    side: ['cast', 'tasks', 'jobs'],
  },
});

export const roleplayModule: VirtuocityModule = {
  id: 'roleplay',
  register: (host) => {
    host.contracts.register(illustratorContract);
    host.contracts.register(summarizerContract);
    host.contracts.register(premiseContract);
    host.contracts.register(directorContract);
    host.blueprints.register(roleplayBlueprint);
  },
};
