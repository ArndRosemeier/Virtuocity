import { describe, expect, it } from 'vitest';
import type { Actor } from './actor';
import { coreModule } from './core-module';
import { ModuleHost, loadModules } from './module';
import { textContent } from './output';
import { retryMessage, retryable } from './retry';
import { SessionRuntime } from './runtime';
import type { Skill } from './skill';

function setup() {
  let take = 0;
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
  return new SessionRuntime({
    host,
    directorId: 'least-recent',
    modelDefaults: () => ({}),
  });
}

const bard: Actor = {
  id: 'bard',
  controller: 'ai',
  personality: { name: 'Bard', description: '' },
  skillIds: ['counting'],
};
const lines = (session: SessionRuntime) => session.transcript().map((m) => m.text);

describe('retrying a message', () => {
  it('drops the message and everything after it, then lets its author answer again', async () => {
    const session = setup();
    await session.join(bard);
    await session.post('user', textContent('hello'));
    await session.runTurn('bard');
    const [, first] = session.transcript();
    await session.post('user', textContent('and then?'));
    await session.runTurn('bard');
    await retryMessage(session, first?.id ?? '');
    expect(lines(session)).toEqual(['hello', 'take 3']);
  });

  it('is only offered for messages of actors that take turns', async () => {
    const session = setup();
    await session.join(bard);
    const mine = await session.post('user', textContent('hello'));
    await session.runTurn('bard');
    const reply = session.transcript()[1];
    expect(retryable(session, mine.id)).toBeUndefined();
    expect(retryable(session, reply?.id ?? '')).toBe('bard');
    await expect(retryMessage(session, mine.id)).rejects.toThrow(/Only a message/);
  });
});
