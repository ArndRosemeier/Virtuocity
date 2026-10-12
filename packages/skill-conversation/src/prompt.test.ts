import { describe, expect, it } from 'vitest';
import type { Actor, Message } from '@virtuocity/core';
import { buildPrompt } from './prompt';

const actor = (id: string, name: string): Actor => ({
  id,
  controller: 'ai',
  personality: { name, description: `${name} is brave.` },
  skillIds: ['conversation'],
});
const msg = (actorId: string, text: string): Message => ({
  id: text,
  actorId,
  createdAt: 0,
  parts: [{ kind: 'text', data: text }],
});

describe('buildPrompt', () => {
  it('casts own lines as assistant and prefixes others with their names', () => {
    const bard = actor('bard', 'Lyra');
    const rogue = actor('rogue', 'Vex');
    const prompt = buildPrompt(
      bard,
      [bard, rogue],
      [msg('rogue', 'Psst.'), msg('bard', 'What?'), msg('user', 'Hi')],
    );
    expect(prompt[0]?.role).toBe('system');
    expect(prompt[0]?.content).toContain('You are Lyra');
    expect(prompt[0]?.content).toContain('Lyra is brave.');
    expect(prompt[0]?.content).toContain('Vex');
    expect(prompt.slice(1)).toEqual([
      { role: 'user', content: 'Vex: Psst.' },
      { role: 'assistant', content: 'What?' },
      { role: 'user', content: 'user: Hi' },
    ]);
  });
});
