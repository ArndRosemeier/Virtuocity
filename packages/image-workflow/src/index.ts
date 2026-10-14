import { speakerContract } from '@virtuocity/contract-speaker';
import { directorContract } from '@virtuocity/contract-director';
import { illustratorContract, pictureSourceContract } from '@virtuocity/contract-visual';
import { sessionTypeContract } from '@virtuocity/core';
import type { Starter, VirtuocityModule } from '@virtuocity/core';

/** Both image session types show the pictures, the session, the input and the side panels. */
const PANELS = ['spaces', 'story', 'composer', 'cast', 'tasks', 'jobs'];

/** The director role; `hint` says whom it lets act, `without` what you do instead. */
const director = (hint: string, without: string) => ({
  label: 'A director',
  question: 'Who decides whose turn it is?',
  hint,
  needs: [directorContract.id],
  importance: 'recommended',
  without,
});

/** The optional gallery role: which picture is the current one. */
const GALLERY = {
  label: 'A gallery',
  question: 'Where do you browse the pictures?',
  hint: 'Shows every picture; the one in view is the one a talking model looks at and refines.',
  needs: [pictureSourceContract.id],
  importance: 'optional',
  without: 'Pictures stay in the conversation; talking models look at the newest.',
};

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
      castContracts: [illustratorContract.id],
      roles: [
        {
          label: 'An illustrator',
          question: 'Who paints your pictures?',
          hint: 'Paints what you describe. Add several to compare their pictures.',
          cast: true,
          importance: 'needed',
          without: 'Nothing gets painted.',
        },
        director(
          'Lets an illustrator answer each prompt on its own.',
          'You click who paints after each prompt.',
        ),
        GALLERY,
      ],
      panels: PANELS,
    },
  },
};

/**
 * The Guided illustrations session type: you say what you want, a prompt
 * refiner (a talking actor, the cast) turns it into a detailed image prompt,
 * and an illustrator paints it on its own after the refiner's turn.
 */
export const guidedIllustrationsType: Starter = {
  id: 'guided-illustrations',
  personality: {
    name: 'Guided illustrations',
    description:
      'Say what you want to see. A prompt refiner turns it into a detailed prompt, and an illustrator paints it.',
  },
  needs: [sessionTypeContract],
  settings: {
    'session-type': {
      castContracts: [speakerContract.id],
      roles: [
        {
          label: 'A prompt refiner',
          question: 'Who turns your ideas into prompts?',
          hint: 'Talks. Turns your idea, and your feedback on the last picture, into one image prompt.',
          cast: true,
          importance: 'needed',
          without: 'Nobody writes the prompts, so nothing gets painted.',
        },
        {
          label: 'An illustrator',
          question: 'Who paints the refined prompts?',
          hint: 'Paints each refined prompt. Needs "Paint on its own" on, like Brush.',
          needs: [illustratorContract.id],
          importance: 'needed',
          without: 'You get prompts, but no pictures.',
        },
        director(
          'Lets the refiner answer when you press Act.',
          'You click the refiner after each of your messages.',
        ),
        GALLERY,
      ],
      panels: PANELS,
    },
  },
};

/** The talking half of guided illustrations, offered on a fresh start. */
export const refinerStarter: Starter = {
  id: 'prompt-refiner',
  personality: {
    name: 'Prompt refiner',
    description:
      "Not a story character: you write prompts for an image model. Turn the person's idea, and any change they ask for to the last picture, into one complete, detailed prompt describing subject, setting, composition, lighting and style. Keep what they liked from earlier prompts. Answer with the prompt only: no greeting, no comments, no quotes.",
  },
  speaks: true,
};

/** An illustrator that paints each refined prompt on its own, for guided illustrations. */
export const brushStarter: Starter = {
  id: 'brush',
  personality: {
    name: 'Brush',
    description: 'Paints every refined prompt as soon as it is written.',
  },
  settings: { illustrator: { automatic: true } },
  needs: [illustratorContract],
};

/** An illustrator that paints only when it is its turn, offered on a fresh start. */
export const painterStarter: Starter = {
  id: 'painter',
  personality: { name: 'Painter', description: 'Paints exactly what you describe.' },
  settings: { illustrator: { automatic: false } },
  needs: [illustratorContract],
};

export const imageWorkflowModule: VirtuocityModule = {
  id: 'image-workflow',
  register: (host) => {
    host.contracts.register(illustratorContract);
    host.contracts.register(directorContract);
    host.contracts.register(pictureSourceContract);
    host.contracts.register(sessionTypeContract);
    [
      imageWorkflowType,
      painterStarter,
      guidedIllustrationsType,
      refinerStarter,
      brushStarter,
    ].forEach((s) => host.starters.register(s));
  },
};
