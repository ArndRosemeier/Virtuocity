import type { SessionTypeDescription } from '@virtuocity/core';
import { sessionTypeContract } from '@virtuocity/core';
import type { Skill, Starter, VirtuocityModule } from '@virtuocity/core';
import { choice, defineSettings, implement, readSettings, z } from '@virtuocity/core';

const role = z.object({
  label: z
    .string()
    .meta({ title: 'Role', description: 'What the guide calls it, e.g. "A narrator".' }),
  hint: z.string().default('').meta({ description: 'One line on what the role adds.' }),
  cast: z
    .boolean()
    .default(false)
    .meta({ title: 'In the cast', description: 'Has one of the cast skills above.' }),
  needs: z
    .array(choice('contracts'))
    .default([])
    .meta({ title: 'Must be able to', description: 'Contracts the actor must serve.' }),
  optional: z.boolean().default(false).meta({ description: 'The session works without it.' }),
});

/** Who is cast, the roles and the panels, as the person sets them in the actor editor. */
export const sessionTypeSettings = defineSettings({
  castSkills: z.array(choice('cast-skills')).default(['conversation']).meta({
    title: 'Cast skills',
    description:
      'Actors with one of these skills are cast and act on their turn, with the first they have. Everyone else is support.',
  }),
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
  const { castSkills, roles, panels } = readSettings(sessionTypeSettings, stored);
  return { castSkills, roles: roles.filter((r) => r.label.trim() !== ''), panels };
}

/**
 * A session type written down by hand: its cast skills, roles and panels, set
 * per actor. Roleplay, Book room, Image workflow and Open are actors with this skill.
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

/** The plainest session type: every panel, everyone who talks is cast, no suggested roles. */
export const openType: Starter = {
  id: 'open',
  personality: {
    name: 'Open',
    description:
      'Every panel, no suggestions. Add whatever actors you like; those who talk are cast.',
  },
  needs: [sessionTypeContract],
  settings: { 'session-type': { castSkills: ['conversation'], roles: [], panels: [] } },
};

export const sessionTypeModule: VirtuocityModule = {
  id: 'skill-session-type',
  register: (host) => {
    host.contracts.register(sessionTypeContract);
    host.skills.register(sessionTypeSkill);
    host.starters.register(openType);
  },
};
