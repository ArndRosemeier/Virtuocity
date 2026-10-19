import { action, check, contentSchema, defineContract, z } from '@virtuocity/core';

/**
 * Runs an automation: a small program of model calls, written by a person,
 * whose result is one message for the session. How the program is written is
 * up to the implementation; the contract only promises the message.
 */
export const automationContract = defineContract({
  name: 'automation',
  version: '1.0',
  description: 'Runs an automation and returns the one message it produces.',
  actions: {
    run: action({
      description: 'Run the automation once and return what it produced.',
      input: z.object({}),
      output: z.object({
        message: contentSchema.describe('What the automation produced, with its text form'),
      }),
    }),
  },
  conformance: [
    {
      name: 'produces one message',
      run: async (t) => {
        const { message } = await t.invoke('run', {});
        check(message.kind.trim() !== '', 'expected the message to say what kind it is');
        check(message.text.trim() !== '', 'expected the message to have a text form');
      },
    },
  ],
});
