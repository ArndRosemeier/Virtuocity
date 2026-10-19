import { describe, expect, it } from 'vitest';
import type { Skill } from './skill';
import { actorUse, settingsProblems } from './skill';

const skill = (id: string, extra: Partial<Skill> = {}): Skill => ({
  id,
  name: id,
  backing: 'code',
  ...extra,
});

describe('actorUse', () => {
  it('asks only for what the chosen skills use', () => {
    expect(actorUse([skill('dice')])).toEqual({ persona: false, character: false, modalities: [] });
    expect(
      actorUse([
        skill('talk', { character: true, modalities: ['text'] }),
        skill('paint', { modalities: ['image', 'text'] }),
      ]),
    ).toEqual({ persona: true, character: true, modalities: ['text', 'image'] });
    expect(actorUse([skill('review', { persona: true })]).character).toBe(false);
  });
});

describe('settingsProblems', () => {
  const strict = skill('strict', {
    checkSettings: (stored) =>
      (stored as { ok?: boolean } | undefined)?.ok ? [] : ['Line 1: not ok'],
  });

  it('lists only the skills that find something wrong with their own settings', () => {
    const found = settingsProblems([skill('dice'), strict], { dice: { ok: false } });
    expect(found.map((f) => [f.skill.id, f.problems])).toEqual([['strict', ['Line 1: not ok']]]);
    expect(settingsProblems([skill('dice'), strict], { strict: { ok: true } })).toEqual([]);
  });
});
