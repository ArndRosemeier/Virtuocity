import { describe, expect, it } from 'vitest';
import type { Actor } from './actor';
import { coreModule } from './core-module';
import { ModuleHost, loadModules } from './module';
import { textContent } from './output';
import { retryMessage } from './retry';
import { SessionRuntime } from './runtime';
import type { Skill } from './skill';
import { messageVersions, showVersion } from './versions';

function setup() {
  let take = 0;
  let clock = 0;
  const counting: Skill = {
    id: 'counting',
    name: 'Counting',
    backing: 'code',
    takeTurn: async (ctx) => {
      await ctx.post(textContent(`take ${++take}`));
    },
  };
  const host = loadModules(new ModuleHost(), [coreModule]);
  host.skills.register(counting);
  return new SessionRuntime({ host, modelDefaults: () => ({}), now: () => ++clock });
}

const bard: Actor = {
  id: 'bard',
  controller: 'ai',
  personality: { name: 'Bard', description: '' },
  skillIds: ['counting'],
};
const lines = (session: SessionRuntime) => session.transcript().map((m) => m.text);
const idAt = (session: SessionRuntime, index: number) => session.transcript()[index]?.id ?? '';
const versionsAt = (session: SessionRuntime, index: number) => {
  const found = messageVersions(session.workspace.log, idAt(session, index));
  return found && { index: found.index, count: found.count };
};

async function retriedOnce() {
  const session = setup();
  await session.join(bard);
  await session.post('user', textContent('hello'));
  await session.runTurn('bard');
  await session.post('user', textContent('and then?'));
  await session.runTurn('bard');
  await retryMessage(session, idAt(session, 1));
  return session;
}

describe('message versions', () => {
  it('keeps the old answer as an earlier version, the new one shown', async () => {
    const session = await retriedOnce();
    expect(lines(session)).toEqual(['hello', 'take 3']);
    expect(versionsAt(session, 1)).toEqual({ index: 1, count: 2 });
    expect(versionsAt(session, 0)).toBeUndefined();
    expect(messageVersions(session.workspace.log, 'gone')).toBeUndefined();
  });

  it('brings back everything that followed an earlier version', async () => {
    const session = await retriedOnce();
    await showVersion(session, idAt(session, 1), 0);
    expect(lines(session)).toEqual(['hello', 'take 1', 'and then?', 'take 2']);
    expect(versionsAt(session, 1)).toEqual({ index: 0, count: 2 });
    expect(versionsAt(session, 3)).toBeUndefined();
    await showVersion(session, idAt(session, 1), 1);
    expect(lines(session)).toEqual(['hello', 'take 3']);
  });

  it('adds a version per retry, the newest last', async () => {
    const session = await retriedOnce();
    await retryMessage(session, idAt(session, 1));
    expect(lines(session)).toEqual(['hello', 'take 4']);
    expect(versionsAt(session, 1)).toEqual({ index: 2, count: 3 });
  });

  it('returns to the newest end of a version that went on after it', async () => {
    const session = await retriedOnce();
    await session.post('user', textContent('more'));
    await showVersion(session, idAt(session, 1), 0);
    await showVersion(session, idAt(session, 1), 1);
    expect(lines(session)).toEqual(['hello', 'take 3', 'more']);
  });
});
