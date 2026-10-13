import type { Actor, SessionRole, Skill } from '@virtuocity/core';
import {
  implement,
  isSessionType,
  sessionTypeContract,
  sessionTypeOf,
  stubContract,
  stubImplementation,
} from '@virtuocity/core';
import { describe, expect, it } from 'vitest';
import type { TypeState } from './sessionType';
import { guideLines, slotItems } from './sessionType';

const talking = stubContract('talking');
const talk: Skill = {
  id: 'talk',
  name: 'Talk',
  backing: 'llm',
  implements: [stubImplementation(talking)],
  takeTurn: () => Promise.resolve(),
};
const typed: Skill = {
  id: 'typed',
  name: 'Typed',
  backing: 'code',
  implements: [
    implement(sessionTypeContract, {
      describe: () => Promise.resolve({ castContracts: [], roles: [], panels: [] }),
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
  cast: false,
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
      description: { castContracts: [], roles: [], panels: ['story'] },
    };
    expect(slotItems(items, 'main', described).map((i) => i.id)).toEqual(['story']);
    expect(slotItems(items, 'side', described)).toEqual([]);
    expect(slotItems(items, 'side', { kind: 'asking' })).toEqual([]);
    expect(slotItems(items, 'side', { kind: 'none' }).map((i) => i.id)).toEqual(['cast']);
  });

  it('guide the cast: each actor fills the first open role it fits, cast by a cast contract', () => {
    const roles = [
      role('A narrator', { cast: true }),
      role('A typist', { needs: ['session-type@3.0'], optional: true }),
      role('A painter', { needs: ['painter@1.0'] }),
      role('Broken', { needs: ['not a ref'] }),
    ];
    const cast = [actor('t', ['typed']), actor('n', ['talk'])];
    expect(guideLines({ roles, castContracts: [] }, skills, cast)[0]?.available).toBe(false);
    const lines = guideLines({ roles, castContracts: [talking.id] }, skills, cast);
    expect(lines.map((l) => [l.role.label, l.available, l.actor?.id])).toEqual([
      ['A narrator', true, 'n'],
      ['A typist', true, 't'],
      ['A painter', false, undefined],
      ['Broken', false, undefined],
    ]);
  });
});
