import type { Actor } from './actor';
import type { Skill } from './skill';

/**
 * Moves an actor off removed skills onto the installed skills that replace
 * them, converting their settings. Returns the actor itself when nothing changes.
 */
export function upgradeActor(actor: Actor, skills: readonly Skill[]): Actor {
  let upgraded = actor;
  for (const skill of skills) {
    for (const old of skill.replaces ?? []) {
      if (!upgraded.skillIds.includes(old.skillId)) continue;
      const skillIds = [
        ...new Set(upgraded.skillIds.map((id) => (id === old.skillId ? skill.id : id))),
      ];
      const { [old.skillId]: previous, ...rest } = upgraded.settings ?? {};
      const converted = previous === undefined ? undefined : old.settings?.(previous);
      const settings = converted === undefined ? rest : { ...rest, [skill.id]: converted };
      upgraded = { ...upgraded, skillIds, settings };
    }
  }
  return upgraded;
}
