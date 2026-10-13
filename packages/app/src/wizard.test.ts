import { describe, expect, it } from 'vitest';
import type { Actor, SessionRole } from '@virtuocity/core';
import { castStarter, isSessionType } from '@virtuocity/core';
import { createHost } from './host';
import { describeType, resolvePicks, roleSteps } from './wizard';

const host = createHost();
const skills = host.skills.list();
const starters = host.starters.list().flatMap((s) => castStarter(s, skills) ?? []);
const roleplay = starters.find((a) => a.id === 'roleplay' && isSessionType(a, skills));
const named = (id: string): Actor | undefined => starters.find((a) => a.id === id);

const role = (label: string, more: Partial<SessionRole> = {}): SessionRole => ({
  label,
  hint: '',
  cast: false,
  needs: [],
  importance: 'needed',
  without: '',
  question: '',
  ...more,
});

describe('the setup wizard', () => {
  it('asks the session type for its roles', async () => {
    expect(roleplay).toBeDefined();
    if (!roleplay) return;
    const { roles } = await describeType(host, roleplay);
    expect(roles[0]?.question).toBe('Who tells the story?');
  });

  it('offers the library actors that fit each role and the skills a new one needs', async () => {
    if (!roleplay) return;
    const steps = roleSteps(await describeType(host, roleplay), skills, starters);
    const [narrator, premise] = steps;
    expect(narrator?.candidates.map((a) => a.id)).toContain('narrator');
    expect(narrator?.skills).toEqual(['conversation']);
    expect(premise?.candidates.map((a) => a.id)).toEqual(['premise']);
    expect(premise?.skills).toEqual(named('premise')?.skillIds);
  });

  it('starts each role with its only free fit, nobody when optional, else waits for a pick', () => {
    const a: Actor = { ...(named('narrator') as Actor), id: 'a' };
    const b: Actor = { ...a, id: 'b' };
    const step = (r: SessionRole, candidates: Actor[]) => ({
      role: r,
      candidates,
      skills: [],
      available: true,
    });
    const steps = [
      step(role('One'), [a]),
      step(role('Two', { importance: 'recommended' }), [a, b]),
      step(role('Three'), [a, b]),
      step(role('Four', { importance: 'optional' }), [a, b]),
    ];
    expect(resolvePicks(steps, [])).toEqual(['a', 'b', undefined, null]);
    expect(resolvePicks(steps, [null, undefined, 'b', 'a'])).toEqual([null, undefined, 'b', 'a']);
  });
});
