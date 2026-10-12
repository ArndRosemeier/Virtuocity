import type { Actor, Message } from '@virtuocity/core';
import { describe, expect, it } from 'vitest';
import { appearances, illustratePrompt, illustratorSettings, sceneToPaint } from './prompt';

const actor = (id: string, name: string, appearance?: string): Actor => ({
  id,
  controller: 'ai',
  personality: { name, description: '' },
  skillIds: [],
  ...(appearance ? { profile: { appearance } } : {}),
});

const message = (actorId: string, text: string): Message => ({
  id: `${actorId}-${text}`,
  actorId,
  createdAt: 0,
  parts: text ? [{ kind: 'text', data: text }] : [{ kind: 'image', data: {} }],
});

describe('illustrator prompt', () => {
  const mira = actor('mira', 'Mira', 'Tall, silver braid, green cloak.');
  const vex = actor('vex', 'Vex', 'Short, scarred, grinning.');
  const ink = { ...actor('ink', 'Ink'), personality: { name: 'Ink', description: 'Moody.' } };

  it('describes how the named actors look', () => {
    expect(appearances([mira, vex], 'Mira opens the gate.')).toEqual([
      'Mira: Tall, silver braid, green cloak.',
    ]);
  });

  it('combines style settings, the illustrator and the people in the scene', () => {
    const settings = illustratorSettings.parse({ style: 'Watercolour' });
    const [prompt] = illustratePrompt(ink, [mira, vex], { description: 'Mira waves.' }, settings);
    expect(prompt?.content).toContain('Style: Watercolour. Moody.');
    expect(prompt?.content).toContain('Mira: Tall, silver braid');
    expect(prompt?.content).not.toContain('Vex');
  });
});

describe('sceneToPaint', () => {
  const story = [
    message('ink', ''),
    message('user', 'We walk.'),
    message('mira', 'The gate creaks.'),
  ];

  it('paints after every message by default and only for the actor whose turn ended', () => {
    expect(sceneToPaint(story, 'ink', 'mira', 1)).toBe('The gate creaks.');
    expect(sceneToPaint(story, 'ink', 'vex', 1)).toBeUndefined();
  });

  it('waits for enough messages since the last picture', () => {
    expect(sceneToPaint(story, 'ink', 'mira', 2)).toBe('The gate creaks.');
    expect(sceneToPaint(story, 'ink', 'mira', 3)).toBeUndefined();
  });
});
