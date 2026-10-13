import { describe, expect, it } from 'vitest';
import { Library, memoryStore } from '@virtuocity/core';
import { createHost } from './host';
import { restoreStarters } from './seed';

describe('restoring the ready-made actors', () => {
  it('sets same-named actors back in place and adds missing ones', async () => {
    const host = createHost();
    const library = new Library(memoryStore<unknown>());
    const edited = {
      id: 'mine',
      controller: 'ai' as const,
      personality: { name: 'Narrator', description: 'Edited by hand.' },
      skillIds: [],
    };
    await library.saveActor(edited);
    const { updated, added } = await restoreStarters(library, host);
    expect(updated).toEqual(['Narrator']);
    expect(added).toContain('Roleplay');
    const narrator = await library.actor('mine');
    expect(narrator?.personality.description).not.toBe('Edited by hand.');
    expect(narrator?.skillIds).toContain('conversation');
    const names = (await library.actors()).map((a) => a.personality.name);
    expect(names.filter((n) => n === 'Narrator')).toHaveLength(1);
  });
});
