import { directorContract } from '@virtuocity/contract-director';
import type { Actor, ModelProvider, Skill } from '@virtuocity/core';
import {
  ModuleHost,
  SessionRuntime,
  coreModule,
  implement,
  loadModules,
  textContent,
} from '@virtuocity/core';
import { describe, expect, it } from 'vitest';
import { directs, rivalDirector, turnTakingModule } from './index';

const provider: ModelProvider = {
  id: 'fake',
  name: 'Fake',
  ready: () => true,
  complete: ({ model, signal }) =>
    model === 'stuck'
      ? new Promise((_resolve, reject) => {
          signal?.addEventListener('abort', () => reject(new Error('aborted')));
        })
      : Promise.resolve({ text: 'hi', stats: { model, promptTokens: 0, completionTokens: 0 } }),
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

/** A director that always names the same actor, and remembers who it could pick. */
const offered: string[][] = [];
const always = (id: string): Skill => ({
  id: `always-${id}`,
  name: `Always ${id}`,
  backing: 'code',
  implements: [
    implement(directorContract, {
      next: ({ candidates }) => {
        offered.push(candidates.map((c) => c.id));
        return Promise.resolve({ next: id });
      },
    }),
  ],
});

const actor = (id: string, controller: Actor['controller'], skillIds: string[] = []): Actor => ({
  id,
  controller,
  personality: { name: id, description: '' },
  skillIds,
});

async function setup(model = 'fake:m') {
  const host = loadModules(new ModuleHost(), [coreModule, turnTakingModule]);
  for (const skill of [talker, always('bard'), always('user')]) host.skills.register(skill);
  host.providers.register(provider);
  const session = new SessionRuntime({ host, modelDefaults: () => ({ text: model }) });
  await session.join(actor('user', 'human'));
  await session.join(actor('bard', 'ai', ['talker']));
  await session.join(actor('wren', 'ai', ['talker']));
  return session;
}

const speakers = (session: SessionRuntime) => session.transcript().map((m) => m.actorId);

describe('turn taking', () => {
  it('lets the person choose who speaks', async () => {
    const session = await setup();
    const result = await session.flows.run('turn-taking', { kind: 'choose', actorId: 'wren' });
    expect(result).toEqual({ outcome: 'paused', steps: 1 });
    expect(speakers(session)).toEqual(['wren']);
  });

  it('lets nobody speak on pass when the session has no director', async () => {
    const session = await setup();
    expect(await session.flows.run('turn-taking', { kind: 'pass' })).toEqual({
      outcome: 'paused',
      steps: 0,
    });
    expect(speakers(session)).toEqual([]);
  });

  it('asks the director to pick from the cast, then that actor speaks', async () => {
    const session = await setup();
    await session.join(actor('director', 'ai', ['always-bard']));
    offered.length = 0;
    await session.flows.run('turn-taking', { kind: 'pass' });
    expect(offered).toEqual([['user', 'bard', 'wren']]);
    expect(speakers(session)).toEqual(['bard']);
  });

  it('waits for the person when the director hands the turn back', async () => {
    const session = await setup();
    await session.join(actor('director', 'ai', ['always-user']));
    await session.flows.run('turn-taking', { kind: 'pass' });
    expect(speakers(session)).toEqual([]);
  });

  it('stops a turn taken through the flow', async () => {
    const session = await setup('fake:stuck');
    const run = session.flows.run('turn-taking', { kind: 'choose', actorId: 'bard' });
    await new Promise((resolve) => setTimeout(resolve, 0));
    await session.stop();
    expect((await run).outcome).not.toBe('failed');
    expect(session.transcript()).toHaveLength(0);
  });
});

describe('one director per session', () => {
  const skills = [talker, always('bard')];
  const director = actor('director', 'ai', ['always-bard']);
  const bard = actor('bard', 'ai', ['talker']);

  it('names the director a second one would clash with', () => {
    const second = actor('second', 'ai', ['always-bard']);
    expect(directs(director, skills)).toBe(true);
    expect(directs(bard, skills)).toBe(false);
    expect(rivalDirector(second, [bard, director], skills)?.id).toBe('director');
  });

  it('lets a director join a session without one, or be updated in place', () => {
    expect(rivalDirector(director, [bard], skills)).toBeUndefined();
    expect(rivalDirector(director, [bard, director], skills)).toBeUndefined();
    expect(rivalDirector(bard, [director], skills)).toBeUndefined();
  });
});
