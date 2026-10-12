import { describe, expect, it } from 'vitest';
import type { Actor } from '@virtuocity/core';
import { actorTip } from './actorTip';

const names: Record<string, string> = { conv: 'Conversation', ill: 'Illustrator' };
const skillName = (id: string) => names[id];

const actor = (over: Partial<Actor> = {}): Actor => ({
  id: 'a',
  controller: 'ai',
  personality: { name: 'Narrator', description: '' },
  skillIds: [],
  ...over,
});

describe('actorTip', () => {
  it('names the skills by their display names, skipping unknown ones', () => {
    const tip = actorTip(actor({ skillIds: ['conv', 'gone', 'ill'] }), skillName);
    expect(tip).toBe('Narrator\nSkills: Conversation, Illustrator');
  });

  it('says when an actor has no skills and when a person plays it', () => {
    const tip = actorTip(
      actor({ controller: 'human', personality: { name: 'You', description: '' } }),
      skillName,
    );
    expect(tip).toBe('You (played by a person)\nNo skills');
  });

  it('adds the first line of the description, cut to fit', () => {
    const long = `${'x'.repeat(200)}\nsecond line`;
    const tip = actorTip(
      actor({ personality: { name: 'N', description: `  ${long}` } }),
      skillName,
    );
    const last = tip.split('\n')[2] ?? '';
    expect(last).toHaveLength(160);
    expect(last.endsWith('…')).toBe(true);
    expect(tip).not.toContain('second line');
  });
});
