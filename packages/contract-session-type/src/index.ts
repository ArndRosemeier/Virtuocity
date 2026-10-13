import { action, check, defineContract, parseRef, z } from '@virtuocity/core';

const role = z.object({
  label: z.string().min(1).describe('What the guide calls the role, e.g. "A narrator"'),
  hint: z.string().describe('One line on what the role adds; may be empty'),
  speaks: z.boolean().describe('The actor in this role takes turns in the conversation'),
  needs: z
    .array(z.string())
    .describe('Contracts the actor in this role must serve, as "name@major.minor"'),
  optional: z.boolean().describe('The session works without this role'),
});

export type SessionRole = z.output<typeof role>;

const description = z.object({
  roles: z.array(role).describe('The parts a session of this type usually casts, in order'),
  panels: z
    .array(z.string())
    .describe('The panels the session shows, by id, in order; empty shows every panel'),
});

export type SessionTypeDescription = z.output<typeof description>;

/**
 * What kind of session this is: Roleplay, Book room, an image workflow. An
 * actor serving it sits in the session's cast (at most one per session) and
 * says which panels the session shows and which roles its guide suggests. It
 * never adds actors itself; the person does. Every use of Virtuocity is a
 * session type, so people make their own by making such an actor.
 */
export const sessionTypeContract = defineContract({
  name: 'session-type',
  version: '1.0',
  description: 'Says how a session looks and which roles it suggests.',
  actions: {
    describe: action({
      description: 'The panels this kind of session shows and the roles it suggests.',
      input: z.object({}),
      output: description,
    }),
  },
  conformance: [
    {
      name: 'names its needs as contract references',
      run: async (t) => {
        const { roles } = await t.invoke('describe', {});
        for (const r of roles) {
          for (const need of r.needs) {
            check(isRef(need), `"${need}" in "${r.label}" is not a contract reference`);
          }
        }
      },
    },
    {
      name: 'describes the same way when asked twice',
      run: async (t) => {
        const first = await t.invoke('describe', {});
        const second = await t.invoke('describe', {});
        check(
          JSON.stringify(first) === JSON.stringify(second),
          'the description changed between two calls',
        );
      },
    },
  ],
});

function isRef(text: string): boolean {
  try {
    parseRef(text);
    return true;
  } catch {
    return false;
  }
}
