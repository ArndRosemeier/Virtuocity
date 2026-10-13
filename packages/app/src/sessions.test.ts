import { describe, expect, it } from 'vitest';
import { memoryStore } from '@virtuocity/core';
import { SessionCatalog, UNNAMED, readStored, sessionNameProblem } from './sessions';

const catalog = () => {
  let n = 0;
  return new SessionCatalog(memoryStore<unknown>(), () => `s${++n}`);
};

describe('session catalog', () => {
  it('reads a session saved before names as "My session"', () => {
    const state = { format: 'virtuocity.session' };
    expect(readStored(state)).toEqual({ name: UNNAMED, template: false, state });
  });

  it('lists sessions by name and keeps names unique', async () => {
    const sessions = catalog();
    await sessions.create('Wren', 1);
    await sessions.create(' anvil ', 2);
    await expect(sessions.create('WREN', 3)).rejects.toThrow('already a session called Wren');
    await expect(sessions.create('  ', 3)).rejects.toThrow('needs a name');
    expect(await sessions.list()).toEqual([
      { id: 's2', name: 'anvil', template: false },
      { id: 's1', name: 'Wren', template: false },
    ]);
    expect(await sessions.freeName('wren')).toBe('wren 2');
  });

  it('keeps name and template flag when the state is saved', async () => {
    const sessions = catalog();
    const id = await sessions.create('Quest', 1);
    await sessions.setTemplate(id, true);
    await sessions.saveState(id, 2);
    expect(await sessions.get(id)).toEqual({ name: 'Quest', template: true, state: 2 });
  });

  it('renames a session, keeping names unique', async () => {
    const sessions = catalog();
    const id = await sessions.create('Quest', 1);
    await sessions.create('Wren', 2);
    await sessions.rename(id, ' QUEST ');
    expect(await sessions.get(id)).toEqual({ name: 'QUEST', template: false, state: 1 });
    await expect(sessions.rename(id, 'wren')).rejects.toThrow('already a session called Wren');
    await expect(sessions.rename(id, '')).rejects.toThrow('needs a name');
    await sessions.rename(id, 'Saga');
    expect((await sessions.list()).map((e) => e.name)).toEqual(['Saga', 'Wren']);
  });

  it('explains what is wrong with a name', () => {
    expect(sessionNameProblem('Quest', ['quest'])).toBe('There is already a session called quest.');
    expect(sessionNameProblem('New', ['Quest'])).toBeUndefined();
  });
});
