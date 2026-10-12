import { describe, expect, it } from 'vitest';
import { hasSkills, parseTags, skillTags } from './libraryTags';

describe('library tags', () => {
  it('matches items that have every selected skill', () => {
    expect(hasSkills(['a', 'b'], [])).toBe(true);
    expect(hasSkills(['a', 'b'], ['a'])).toBe(true);
    expect(hasSkills(['a', 'b'], ['a', 'b'])).toBe(true);
    expect(hasSkills(['a'], ['a', 'b'])).toBe(false);
  });

  it('offers only the skills in use, counted and sorted by name', () => {
    const skills = [
      { id: 'w', name: 'Writer' },
      { id: 'c', name: 'Conversation' },
      { id: 'd', name: 'Dice' },
    ];
    expect(skillTags(skills, [['w', 'c'], ['c'], []])).toEqual([
      { id: 'c', label: 'Conversation', count: 2 },
      { id: 'w', label: 'Writer', count: 1 },
    ]);
  });

  it('reads a stored selection and ignores anything else', () => {
    expect(parseTags('["a","b"]')).toEqual(['a', 'b']);
    expect(parseTags('["a",1]')).toEqual(['a']);
    expect(parseTags('{"a":1}')).toEqual([]);
    expect(parseTags('')).toEqual([]);
  });
});
