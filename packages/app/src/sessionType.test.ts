import { sessionTypeContract } from '@virtuocity/contract-session-type';
import type { SessionRole } from '@virtuocity/contract-session-type';
import type { Actor, Skill } from '@virtuocity/core';
import { implement } from '@virtuocity/core';
import { describe, expect, it } from 'vitest';
import type { TypeState } from './sessionType';
import { guideLines, isSessionType, sessionTypeOf, slotItems } from './sessionType';

const talk: Skill = { id: 'talk', name: 'Talk', backing: 'llm', takeTurn: () => Promise.resolve() };
const typed: Skill = {
  id: 'typed',
  name: 'Typed',
  backing: 'code',
  implements: [
    implement(sessionTypeContract, {
      describe: () => Promise.resolve({ roles: [], panels: [] }),
    }),
  ],
};
const skills = [talk, typed];

const actor = (id: string, skillIds: string[]): Actor => ({
  id,
  controller: 'ai',
  personality: { name: id, description: '' },
  skillIds,
});
const role = (label: string, more: Partial<SessionRole> = {}): SessionRole => ({
  label,
  hint: '',
  speaks: false,
  needs: [],
  optional: false,
  ...more,
});

describe('session types', () => {
  it('are the actors serving session-type', () => {
    const roleplay = actor('Roleplay', ['typed']);
    expect(isSessionType(roleplay, skills)).toBe(true);
    expect(sessionTypeOf([actor('Mira', ['talk']), roleplay], skills)).toBe(roleplay);
  });

  it('decide the panels of every slot, show none while asked, and all without a type', () => {
    const items = [
      { id: 'story', slot: 'main' },
      { id: 'cast', slot: 'side' },
    ];
    const described: TypeState = {
      kind: 'described',
      actor: actor('Roleplay', ['typed']),
      description: { roles: [], panels: ['story'] },
    };
    expect(slotItems(items, 'main', described).map((i) => i.id)).toEqual(['story']);
    expect(slotItems(items, 'side', described)).toEqual([]);
    expect(slotItems(items, 'side', { kind: 'asking' })).toEqual([]);
    expect(slotItems(items, 'side', { kind: 'none' }).map((i) => i.id)).toEqual(['cast']);
  });

  it('guide the cast: each actor fills the first open role it fits', () => {
    const roles = [
      role('A narrator', { speaks: true }),
      role('A typist', { needs: ['session-type@1.0'], optional: true }),
      role('A painter', { needs: ['painter@1.0'] }),
      role('Broken', { needs: ['not a ref'] }),
    ];
    const lines = guideLines(roles, skills, [actor('t', ['typed']), actor('n', ['talk'])]);
    expect(lines.map((l) => [l.role.label, l.available, l.actor?.id])).toEqual([
      ['A narrator', true, 'n'],
      ['A typist', true, 't'],
      ['A painter', false, undefined],
      ['Broken', false, undefined],
    ]);
  });
});
