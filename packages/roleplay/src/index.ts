import { illustratorContract } from '@virtuocity/contract-visual';
import type { VirtuocityModule } from '@virtuocity/core';
import { defineBlueprint } from '@virtuocity/core';

/** A narrator and a companion tell a story with you; an illustrator paints it if one is installed. */
export const roleplayBlueprint = defineBlueprint({
  id: 'roleplay',
  name: 'Roleplay',
  description:
    'A narrator sets the scene and a companion travels with you. Add an illustrator to see the story.',
  roles: [
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
      id: 'companion',
      personality: {
        name: 'Wren',
        description: 'A quick-witted traveller with a soft spot for strays and a habit of humming.',
      },
      speaks: true,
    },
    {
      id: 'illustrator',
      personality: { name: 'Ink', description: 'Paints in loose, warm watercolour.' },
      needs: [illustratorContract],
      optional: true,
    },
  ],
  layout: { main: ['story'], input: ['composer'], side: ['channels', 'cast', 'tasks', 'jobs'] },
});

export const roleplayModule: VirtuocityModule = {
  id: 'roleplay',
  register: (host) => {
    host.contracts.register(illustratorContract);
    host.blueprints.register(roleplayBlueprint);
  },
};
