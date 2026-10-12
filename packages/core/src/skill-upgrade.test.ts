import { describe, expect, it } from 'vitest';
import type { Actor } from './actor';
import type { Skill } from './skill';
import { upgradeActor } from './skill-upgrade';

const skill: Skill = {
  id: 'new',
  name: 'New',
  backing: 'code',
  replaces: [{ skillId: 'old', settings: (old) => ({ text: (old as { prompt: string }).prompt }) }],
};

const actor = (skillIds: string[], settings?: Record<string, unknown>): Actor => ({
  id: 'a',
  controller: 'ai',
  personality: { name: 'A', description: '' },
  skillIds,
  ...(settings ? { settings } : {}),
});

describe('upgradeActor', () => {
  it('swaps a removed skill for its replacement and converts its settings', () => {
    const upgraded = upgradeActor(actor(['old', 'other'], { old: { prompt: 'Ships' } }), [skill]);
    expect(upgraded.skillIds).toEqual(['new', 'other']);
    expect(upgraded.settings).toEqual({ new: { text: 'Ships' } });
  });

  it('keeps the actor as it is when it has no removed skill', () => {
    const current = actor(['new'], { new: { text: 'Kept' } });
    expect(upgradeActor(current, [skill])).toBe(current);
  });

  it('does not list the replacement twice', () => {
    expect(upgradeActor(actor(['old', 'new']), [skill]).skillIds).toEqual(['new']);
  });
});
