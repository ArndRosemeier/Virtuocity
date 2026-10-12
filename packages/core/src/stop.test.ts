import { describe, expect, it } from 'vitest';
import type { Actor } from './actor';
import { coreModule } from './core-module';
import { ModuleHost, loadModules } from './module';
import { textContent } from './output';
import type { ModelProvider } from './provider';
import { SessionRuntime } from './runtime';
import type { Skill } from './skill';

/** A provider that never answers, like a stuck model, until the call is aborted. */
const stuck: ModelProvider = {
  id: 'stuck',
  complete: ({ signal }) =>
    new Promise((_resolve, reject) => {
      signal?.addEventListener('abort', () => reject(new Error('aborted')));
    }),
};

const talker: Skill = {
  id: 'talker',
  name: 'Talker',
  backing: 'llm',
  takeTurn: async (ctx) => {
    const { text } = await ctx.complete({ modality: 'text', messages: [] });
    await ctx.post(textContent(text));
  },
};

const bard: Actor = {
  id: 'bard',
  controller: 'ai',
  personality: { name: 'Bard', description: '' },
  skillIds: ['talker'],
};

function setup() {
  const host = loadModules(new ModuleHost(), [coreModule]);
  host.skills.register(talker);
  host.providers.register(stuck);
  return new SessionRuntime({
    host,
    providerId: 'stuck',
    directorId: 'least-recent',
    modelDefaults: () => ({ text: 'model' }),
  });
}

describe('stopping a turn', () => {
  it('aborts a stuck model call and ends the turn quietly, posting nothing', async () => {
    const session = setup();
    await session.join(bard);
    const turn = session.runTurn('bard');
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(session.speaking).toBe('bard');
    await session.stop();
    await expect(turn).resolves.toBeUndefined();
    expect(session.speaking).toBeUndefined();
    expect(session.transcript()).toHaveLength(0);
    expect(session.calls.list()[0]?.status).toBe('cancelled');
  });

  it('stops a turn taken through the turn-taking flow', async () => {
    const session = setup();
    await session.join(bard);
    const run = session.flows.run('turn-taking', { kind: 'choose', actorId: 'bard' });
    await new Promise((resolve) => setTimeout(resolve, 0));
    await session.stop();
    expect((await run).outcome).not.toBe('failed');
    expect(session.transcript()).toHaveLength(0);
  });
});
