import type { SessionTypeDescription } from '@virtuocity/contract-session-type';
import { sessionTypeContract } from '@virtuocity/contract-session-type';
import type { Skill, VirtuocityModule } from '@virtuocity/core';
import { choice, defineSettings, implement, readSettings, z } from '@virtuocity/core';

const role = z.object({
  label: z
    .string()
    .meta({ title: 'Role', description: 'What the guide calls it, e.g. "A narrator".' }),
  hint: z.string().default('').meta({ description: 'One line on what the role adds.' }),
  speaks: z
    .boolean()
    .default(false)
    .meta({ title: 'Talks', description: 'Takes turns in the conversation.' }),
  needs: z
    .array(choice('contracts'))
    .default([])
    .meta({ title: 'Must be able to', description: 'Contracts the actor must serve.' }),
  optional: z.boolean().default(false).meta({ description: 'The session works without it.' }),
});

/** The roles and panels, as the person sets them in the actor editor. */
export const sessionTypeSettings = defineSettings({
  roles: z
    .array(role)
    .default([])
    .meta({ description: 'What the setup guide suggests adding, in order.' }),
  panels: z
    .array(choice('panels'))
    .default([])
    .meta({ description: 'What the session shows, in order. Leave empty to show every panel.' }),
});

/** The settings as a description; roles still without a name are left out. */
export function describeSettings(stored: unknown): SessionTypeDescription {
  const { roles, panels } = readSettings(sessionTypeSettings, stored);
  return { roles: roles.filter((r) => r.label.trim() !== ''), panels };
}

/**
 * A session type written down by hand: a fixed list of roles and panels, set
 * per actor. Roleplay and Book room are actors with this skill.
 */
export const sessionTypeSkill: Skill = {
  id: 'session-type',
  name: 'Session type',
  backing: 'code',
  settings: sessionTypeSettings,
  implements: [
    implement(sessionTypeContract, {
      describe: (_input, ctx) => Promise.resolve(describeSettings(ctx.settings)),
    }),
  ],
};

export const sessionTypeModule: VirtuocityModule = {
  id: 'skill-session-type',
  register: (host) => {
    host.contracts.register(sessionTypeContract);
    host.skills.register(sessionTypeSkill);
  },
};
