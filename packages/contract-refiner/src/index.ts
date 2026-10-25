import { action, check, contentSchema, defineContract, textContent, z } from '@virtuocity/core';

/**
 * Refines a draft the person has not sent yet, e.g. what is in the input box,
 * and hands back the new draft to replace it. Nothing is posted to the
 * session. The draft is content of any kind; today the input box holds text.
 */
export const refinerContract = defineContract({
  name: 'refiner',
  version: '1.0',
  description: 'Refines a draft the person has not sent yet and returns the new draft.',
  actions: {
    refine: action({
      description: 'Refine the draft and return the refined draft in its place.',
      input: z.object({ draft: contentSchema.describe('The draft as it is now') }),
      output: z.object({ draft: contentSchema.describe('The refined draft') }),
    }),
  },
  conformance: [
    {
      name: 'returns a refined draft',
      run: async (t) => {
        const { draft } = await t.invoke('refine', { draft: textContent('the fox jump') });
        check(draft.kind.trim() !== '', 'expected the draft to say what kind it is');
        check(draft.text.trim() !== '', 'expected the refined draft to have a text form');
      },
    },
  ],
});
