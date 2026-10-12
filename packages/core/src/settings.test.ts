import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import type { Actor } from './actor';
import { castDoc } from './cast';
import {
  defineProfileField,
  defineSettings,
  profileValue,
  readSettings,
  skillSettings,
} from './settings';

const settings = defineSettings({
  length: z.enum(['short', 'long']).default('short'),
  words: z.number().int().min(1).default(100),
});

const actor: Actor = {
  id: 'a',
  controller: 'ai',
  personality: { name: 'A', description: '' },
  skillIds: ['talk'],
  settings: { talk: { length: 'long', words: -5 } },
  profile: { mood: 'cheerful', height: 'tall' },
};

describe('skill settings', () => {
  it('requires a default for every field', () => {
    expect(() => defineSettings({ name: z.string() })).toThrow(/need defaults: name/);
  });

  it('fills in defaults and drops invalid values one by one', () => {
    expect(readSettings(settings, undefined)).toEqual({ length: 'short', words: 100 });
    expect(readSettings(settings, 'nonsense')).toEqual({ length: 'short', words: 100 });
    expect(skillSettings(actor, 'talk', settings)).toEqual({ length: 'long', words: 100 });
    expect(skillSettings(actor, 'other', settings)).toEqual({ length: 'short', words: 100 });
  });

  it('stores settings and profiles with the actor in the cast', () => {
    expect(castDoc.op.safeParse({ type: 'join', actor }).success).toBe(true);
  });
});

describe('profile fields', () => {
  it('reads valid values only', () => {
    const mood = defineProfileField({
      id: 'mood',
      label: 'Mood',
      description: 'How they feel',
      schema: z.enum(['cheerful', 'grim']),
    });
    const height = defineProfileField({
      id: 'height',
      label: 'Height',
      description: '',
      schema: z.number(),
    });
    expect(profileValue(actor, mood)).toBe('cheerful');
    expect(profileValue(actor, height)).toBeUndefined();
  });
});
