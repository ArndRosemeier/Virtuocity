import { describe, expect, it, vi } from 'vitest';
import type { Actor } from './actor';
import { coreModule } from './core-module';
import { ModuleHost, loadModules } from './module';
import type { ModelProvider } from './provider';
import { SessionRuntime, messagePosted } from './runtime';
import type { Skill } from './skill';

const echo: Skill = {
  id: 'echo',
  name: 'Echo',
  backing: 'llm',
  models: { text: 'skill-model' },
  async takeTurn(ctx) {
    const result = await ctx.complete({ modality: 'text', messages: [] });
    await ctx.post([{ kind: 'text', data: result.text }], [result.stats]);
  },
};

const counter = { seen: 0 };
const listener: Skill = {
  id: 'listener',
  name: 'Listener',
  backing: 'code',
  listensTo: [messagePosted.type],
  onEvent: () => {
    counter.seen++;
    return Promise.resolve();
  },
};

const provider: ModelProvider = {
  id: 'fake',
  complete: vi.fn(({ model }) =>
    Promise.resolve({
      text: `from ${model}`,
      stats: { model, promptTokens: 1, completionTokens: 1 },
    }),
  ),
};

function setup() {
  const host = loadModules(new ModuleHost(), [coreModule]);
  host.skills.register(echo);
  host.skills.register(listener);
  host.providers.register(provider);
  return new SessionRuntime({
    host,
    providerId: 'fake',
    directorId: 'least-recent',
    modelDefaults: () => ({ text: 'default-model' }),
  });
}

const ai = (id: string, skillIds: string[]): Actor => ({
  id,
  controller: 'ai',
  personality: { name: id, description: '' },
  skillIds,
});

describe('SessionRuntime', () => {
  it('runs one turn on pass, with the skill model override and stats', async () => {
    const session = setup();
    await session.join(ai('bard', ['echo']));
    const next = await session.pass();
    expect(next?.id).toBe('bard');
    const [message] = session.messages.activePath();
    expect(message?.parts[0]?.data).toBe('from skill-model');
    expect(message?.stats?.[0]?.model).toBe('skill-model');
  });

  it('treats actors without a turn-taking skill as silent and still delivers events to them', async () => {
    const session = setup();
    await session.join(ai('scribe', ['listener']));
    expect(session.speakers()).toEqual([]);
    expect(await session.pass()).toBeUndefined();
    counter.seen = 0;
    await session.post('user', [{ kind: 'text', data: 'hi' }]);
    expect(counter.seen).toBe(1);
  });

  it('announces turns and clears the speaker even when a turn fails', async () => {
    const session = setup();
    const seen: string[] = [];
    session.bus.on('*', (e) => {
      if (e.type.startsWith('turn.')) seen.push(`${e.type}:${session.speaking ?? '-'}`);
    });
    await session.join(ai('bard', ['echo']));
    await session.runTurn('bard');
    expect(seen).toEqual(['turn.started:bard', 'turn.ended:-']);
    vi.mocked(provider.complete).mockRejectedValueOnce(new Error('boom'));
    await expect(session.runTurn('bard')).rejects.toThrow('boom');
    expect(session.speaking).toBeUndefined();
  });

  it('lets actors leave at any time', async () => {
    const session = setup();
    await session.join(ai('bard', ['echo']));
    await session.leave('bard');
    expect(session.actors).toEqual([]);
    await expect(session.runTurn('bard')).rejects.toThrow(/cannot take a turn/);
  });
});
