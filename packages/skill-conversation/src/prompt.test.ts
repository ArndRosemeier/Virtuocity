import { describe, expect, it } from 'vitest';
import type { Actor, Message } from '@virtuocity/core';
import { textContent } from '@virtuocity/core';
import { buildPrompt, conversationSettings, contextBudget } from './prompt';

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
  ...textContent(text),
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

describe('reading the story', () => {
  it('reads every kind of message through its text form', () => {
    const bard = actor('bard', 'Lyra');
    const picture: Message = {
      id: 'p',
      actorId: 'ink',
      createdAt: 0,
      kind: 'image',
      data: { assetId: 'x' },
      text: 'A gate in fog',
    };
    const prompt = buildPrompt(
      bard,
      [bard],
      [msg('bard', '[dice_roll → 4]'), msg('bard', 'A four.'), picture, msg('ink', '')],
    );
    expect(prompt.slice(1)).toEqual([
      { role: 'assistant', content: '[dice_roll → 4]' },
      { role: 'assistant', content: 'A four.' },
      { role: 'user', content: 'ink: A gate in fog' },
    ]);
  });
});

describe('the scene', () => {
  it('names only the cast as others in the scene, but still names support actors in the story', () => {
    const bard = actor('bard', 'Lyra');
    const ink = actor('ink', 'Ink');
    const prompt = buildPrompt(bard, [bard, ink], [msg('ink', 'A gate in fog')], {
      cast: [bard],
    });
    expect(prompt[0]?.content).toContain('Others in the scene: nobody else yet.');
    expect(prompt[1]).toEqual({ role: 'user', content: 'Ink: A gate in fog' });
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

  it('keeps the whole story when memory is unlimited, the default', () => {
    const bard = actor('bard', 'Lyra');
    const long = Array.from({ length: 50 }, (_, i) => msg('vex', `Line ${i} ${'x'.repeat(400)}`));
    expect(conversationSettings.parse({}).memory).toBeUndefined();
    expect(buildPrompt(bard, [bard], long)).toHaveLength(51);
    expect(contextBudget(conversationSettings.parse({}))).toBe(Infinity);
    expect(contextBudget(conversationSettings.parse({ memory: 8000 }))).toBe(2000);
  });
});
