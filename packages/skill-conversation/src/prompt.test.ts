import { describe, expect, it } from 'vitest';
import type { Actor, Message } from '@virtuocity/core';
import { buildPrompt, conversationSettings } from './prompt';

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

describe('length setting', () => {
  it('tells the model how much to write', () => {
    const bard = actor('bard', 'Lyra');
    const settings = conversationSettings.parse({ length: 'short' });
    const [system] = buildPrompt(bard, [bard], [], { settings });
    expect(system?.content).toContain('one to three sentences');
    expect(buildPrompt(bard, [bard], [])[0]?.content).toContain('about one paragraph');
  });
});

describe('memory', () => {
  it('adds background knowledge and keeps only the newest lines that fit', () => {
    const bard = actor('bard', 'Lyra');
    const long = Array.from({ length: 50 }, (_, i) => msg('vex', `Line ${i} ${'x'.repeat(400)}`));
    const settings = conversationSettings.parse({ memory: 1000 });
    const prompt = buildPrompt(bard, [bard], long, { settings, context: '## Who is here\n- Vex' });
    expect(prompt[0]?.content).toContain('What you know:');
    expect(prompt[0]?.content).toContain('- Vex');
    expect(prompt.length).toBeLessThan(long.length);
    expect(prompt.at(-1)?.content).toContain('Line 49');
  });
});
