import { directorContract } from '@virtuocity/contract-director';
import { illustratorContract } from '@virtuocity/contract-visual';
import { sessionTypeContract } from '@virtuocity/core';
import type { Starter, VirtuocityModule } from '@virtuocity/core';

/**
 * The Image workflow session type: you write what you want to see and an
 * illustrator paints it. Illustrators are its cast, so they act on their
 * turn; an illustrator that can also talk still paints here.
 */
export const imageWorkflowType: Starter = {
  id: 'image-workflow',
  personality: {
    name: 'Image workflow',
    description:
      'Describe what you want to see, an illustrator paints it, and you refine it prompt by prompt.',
  },
  needs: [sessionTypeContract],
  settings: {
    'session-type': {
      castSkills: ['illustrator'],
      roles: [
        {
          label: 'An illustrator',
          hint: 'Paints what you describe. Add several to compare their pictures.',
          cast: true,
        },
        {
          label: 'A director',
          hint: 'Lets an illustrator answer each prompt on its own. Without one, you click who paints.',
          needs: [directorContract.id],
          optional: true,
        },
      ],
      panels: ['spaces', 'story', 'composer', 'cast', 'tasks', 'jobs'],
    },
  },
};

/** An illustrator that paints only when it is its turn, offered on a fresh start. */
export const painterStarter: Starter = {
  id: 'painter',
  personality: { name: 'Painter', description: 'Paints exactly what you describe.' },
  settings: { illustrator: { automatic: false, inStory: true } },
  needs: [illustratorContract],
};

export const imageWorkflowModule: VirtuocityModule = {
  id: 'image-workflow',
  register: (host) => {
    host.contracts.register(illustratorContract);
    host.contracts.register(directorContract);
    host.contracts.register(sessionTypeContract);
    [imageWorkflowType, painterStarter].forEach((s) => host.starters.register(s));
  },
};
