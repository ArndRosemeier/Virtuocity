import { describe, expect, it } from 'vitest';
import type { Skill } from './skill';
import { actorUse } from './skill';

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
