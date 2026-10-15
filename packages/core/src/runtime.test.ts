import { describe, expect, it, vi } from 'vitest';
import type { Actor } from './actor';
import { coreModule } from './core-module';
import { textContent } from './output';
import { ModuleHost, loadModules } from './module';
import type { ModelProvider } from './provider';
import { SessionRuntime } from './runtime';
import { messagePosted } from './session-events';
import type { Skill } from './skill';

const echo: Skill = {
  id: 'echo',
  name: 'Echo',
  backing: 'llm',
  models: { text: 'fake:skill-model' },
  async takeTurn(ctx) {
    const result = await ctx.complete({ modality: 'text', messages: [] });
    await ctx.post(textContent(result.text), [result.stats]);
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
  name: 'Fake',
  ready: () => true,
  complete: vi.fn(({ model }) =>
    Promise.resolve({
      text: `from ${model}`,
      stats: { model, promptTokens: 1, completionTokens: 1 },
    }),
  ),
};

const sketcher: Skill = {
  id: 'sketcher',
  name: 'Sketcher',
  backing: 'code',
  onRequest: async (ctx) => {
    await ctx.post(textContent('A sketch.'));
  },
};

function setup() {
  const host = loadModules(new ModuleHost(), [coreModule]);
  host.skills.register(echo);
  host.skills.register(listener);
  host.skills.register(sketcher);
  host.providers.register(provider);
  return new SessionRuntime({
    host,
    modelDefaults: () => ({ text: 'fake:default-model' }),
  });
}

const ai = (id: string, skillIds: string[]): Actor => ({
  id,
  controller: 'ai',
  personality: { name: id, description: '' },
  skillIds,
});

describe('SessionRuntime', () => {
  it('runs a turn with the skill model override and stats', async () => {
    const session = setup();
    await session.join(ai('bard', ['echo']));
    await session.runTurn('bard');
    const [message] = session.transcript();
    expect(message?.data).toBe('from skill-model');
    expect(message?.stats?.[0]?.model).toBe('skill-model');
  });

  it('treats actors without a turn-taking skill as silent and still delivers events to them', async () => {
    const session = setup();
    await session.join(ai('scribe', ['listener']));
    expect(session.speakers()).toEqual([]);
    counter.seen = 0;
    await session.post('user', textContent('hi'));
    expect(counter.seen).toBe(1);
  });

  it('lets a person ask an on-request actor to act', async () => {
    const session = setup();
    await session.join(ai('pen', ['sketcher']));
    expect(session.speakers()).toEqual([]);
    expect(session.cast()).toEqual([]);
    expect(session.askable().map((a) => a.id)).toEqual(['pen']);
    await session.runTurn('pen');
    expect(session.transcript().map((m) => m.text)).toEqual(['A sketch.']);
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

  it('assists the person with the default model, traced and counted', async () => {
    const session = setup();
    const messages = [{ role: 'user' as const, content: 'grumpy teen' }];
    const result = await session.assist({ modality: 'text', messages }, 'transform');
    expect(result.text).toBe('from default-model');
    expect(session.calls.list()[0]).toMatchObject({ actorId: 'user', skillId: 'transform' });
    expect(session.allStats()).toHaveLength(1);
  });

  it('lets actors leave at any time', async () => {
    const session = setup();
    await session.join(ai('bard', ['echo']));
    await session.leave('bard');
    expect(session.actors).toEqual([]);
    await expect(session.runTurn('bard')).rejects.toThrow(/cannot take a turn/);
  });
});

describe('SessionRuntime transcript', () => {
  const text = (session: SessionRuntime, perspective?: string) =>
    session.transcript(perspective).map((m) => m.data);

  it('edits messages and rewinds all state to a message, before it, or as a branch', async () => {
    const session = setup();
    const first = await session.post('user', textContent('one'));
    const second = await session.post('user', textContent('two'));
    await session.editMessage('user', first.id, textContent('uno'));
    expect(text(session)).toEqual(['uno', 'two']);
    // An edit rewrites the message where it was posted, so rewinding keeps it.
    await session.rewindToMessage(second.id, { before: true, keepBranch: true });
    expect(text(session)).toEqual(['uno']);
    await session.post('user', textContent('dos'));
    expect(text(session)).toEqual(['uno', 'dos']);
    expect(session.workspace.log.leaves()).toHaveLength(2);
    await session.rewindToMessage(first.id);
    expect(text(session)).toEqual(['uno']);
    expect(session.workspace.log.all().map((op) => op.payload)).not.toContainEqual(
      expect.objectContaining({ type: 'edit' }),
    );
  });

  it('keeps a deleted message deleted when rewinding past later messages', async () => {
    const session = setup();
    await session.post('user', textContent('one'));
    const second = await session.post('user', textContent('two'));
    const third = await session.post('user', textContent('three'));
    await session.removeMessage('user', second.id);
    await session.rewindToMessage(third.id, { before: true });
    expect(text(session)).toEqual(['one']);
  });

  it('removes one message and keeps everything after it', async () => {
    const session = setup();
    const first = await session.post('user', textContent('one'));
    await session.post('user', textContent('two'));
    await session.removeMessage('user', first.id);
    expect(text(session)).toEqual(['two']);
  });

  it('keeps whispers out of other perspectives, including the skill context', async () => {
    const session = setup();
    await session.join(ai('bard', ['echo']));
    await session.post('user', textContent('hello all'));
    await session.post('user', textContent('psst, rogue'), undefined, {
      audience: ['rogue'],
    });
    expect(text(session, 'bard')).toEqual(['hello all']);
    expect(text(session, 'rogue')).toEqual(['hello all', 'psst, rogue']);
    let seen: readonly unknown[] = [];
    const peek: Skill = {
      id: 'peek',
      name: 'Peek',
      backing: 'code',
      takeTurn: (ctx) => {
        seen = ctx.transcript.map((m) => m.data);
        return Promise.resolve();
      },
    };
    const host = loadModules(new ModuleHost(), [coreModule]);
    host.skills.register(peek);
    const other = new SessionRuntime({
      host,
      modelDefaults: () => ({}),
    });
    await other.join(ai('bard', ['peek']));
    await other.post('user', textContent('secret'), undefined, { audience: ['x'] });
    await other.runTurn('bard');
    expect(seen).toEqual([]);
  });

  it('tells those who see a hidden message whom it was hidden from', async () => {
    const session = setup();
    await session.post('gm', textContent('the heir did it'), undefined, { hiddenFrom: ['user'] });
    expect(text(session, 'user')).toEqual([]);
    expect(session.transcript('bard')[0]?.hiddenFrom).toEqual(['user']);
  });

  it('counts every AI call, even on branches that were thrown away', async () => {
    const session = setup();
    await session.join(ai('bard', ['echo']));
    const first = await session.post('user', textContent('go'));
    await session.runTurn('bard');
    await session.rewindToMessage(first.id);
    await session.runTurn('bard');
    expect(session.transcript()).toHaveLength(2);
    expect(session.allStats()).toHaveLength(2);
  });
});

describe('cast and support', () => {
  it('puts people and talking actors in the cast, and leaves support actors out', async () => {
    const session = setup();
    const person: Actor = { ...ai('you', []), controller: 'human' };
    for (const actor of [person, ai('bard', ['echo']), ai('ink', ['listener'])]) {
      await session.join(actor);
    }
    expect(session.cast().map((a) => a.id)).toEqual(['you', 'bard']);
  });
});
