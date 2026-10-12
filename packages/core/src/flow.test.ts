import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import type { Actor } from './actor';
import { action, defineContract } from './contract';
import { coreModule } from './core-module';
import { defineDocType } from './doc-type';
import type { Flow } from './flow';
import { defineFlow, flowEnded } from './flow';
import { ModuleHost, loadModules } from './module';
import type { ModelProvider } from './provider';
import { SessionRuntime } from './runtime';
import type { Skill } from './skill';

const approval = defineContract({
  name: 'approver',
  version: '1.0',
  description: 'Approves things',
  actions: {
    approve: action({
      description: 'Approve?',
      input: z.object({ what: z.string() }),
      output: z.boolean(),
    }),
  },
});
const log = defineDocType<readonly string[], string>({
  id: 'log',
  version: 1,
  description: 'Lines',
  op: z.string(),
  initial: () => [],
  apply: (s, op) => [...s, op],
});

const signals: (AbortSignal | undefined)[] = [];
const provider: ModelProvider = {
  id: 'fake',
  complete: (request) => {
    signals.push(request.signal);
    return Promise.resolve({
      text: 'hi',
      stats: { model: request.model, promptTokens: 0, completionTokens: 0 },
    });
  },
};
const talker: Skill = {
  id: 'talker',
  name: 'Talker',
  backing: 'llm',
  takeTurn: async (ctx) => {
    const r = await ctx.complete({ modality: 'text', messages: [] });
    await ctx.post([{ kind: 'text', data: r.text }]);
  },
};

const forever = defineFlow<{ readonly speaker: string }>({
  id: 'forever',
  name: 'Forever',
  description: 'Keeps talking',
  input: z.object({ speaker: z.string() }),
  run: async (ctx, input) => {
    await ctx.state.change('log', log, 'started');
    for (;;) await ctx.runTurn(input.speaker);
  },
});
const ask = defineFlow<Record<string, never>>({
  id: 'ask',
  name: 'Ask',
  description: 'Asks the human',
  input: z.object({}),
  run: async (ctx) => {
    await ctx.invoke('user', approval, 'approve', { what: 'chapter one' });
  },
});
const broken = defineFlow<Record<string, never>>({
  id: 'broken',
  name: 'Broken',
  description: 'Fails',
  input: z.object({}),
  run: () => Promise.reject(new Error('boom')),
});

const person = (id: string, controller: Actor['controller'], skillIds: string[] = []): Actor => ({
  id,
  controller,
  personality: { name: id, description: '' },
  skillIds,
});

async function setup() {
  const host = loadModules(new ModuleHost(), [coreModule]);
  host.skills.register(talker);
  host.providers.register(provider);
  for (const flow of [forever, ask, broken]) host.flows.register(flow as Flow);
  const session = new SessionRuntime({
    host,
    providerId: 'fake',
    directorId: 'least-recent',
    modelDefaults: () => ({ text: 'm' }),
  });
  await session.join(person('user', 'human'));
  await session.join(person('bard', 'ai', ['talker']));
  return session;
}

describe('FlowRunner', () => {
  it('stops a run at its step limit and announces the result', async () => {
    const session = await setup();
    const ended: string[] = [];
    session.bus.on(flowEnded, (e) => void ended.push(e.payload.result.outcome));
    const result = await session.flows.run('forever', { speaker: 'bard' }, { maxSteps: 3 });
    expect(result).toEqual({ outcome: 'step-limit', steps: 3 });
    expect(session.transcript()).toHaveLength(3);
    expect(session.workspace.read('log', log)).toEqual(['started']);
    expect(session.workspace.log.path().find((op) => op.docId === 'log')?.actorId).toBe(
      'flow:forever',
    );
    expect(ended).toEqual(['step-limit']);
    expect(session.flows.running).toBeUndefined();
  });

  it('passes the run signal to model calls', async () => {
    const session = await setup();
    signals.length = 0;
    await session.flows.run('forever', { speaker: 'bard' }, { maxSteps: 1 });
    expect(signals[0]).toBeInstanceOf(AbortSignal);
  });

  it('pauses on a human task and an interrupt cancels it', async () => {
    const session = await setup();
    const running = session.flows.run('ask', {});
    await new Promise((r) => setTimeout(r, 0));
    expect(session.tasks.pending()).toHaveLength(1);
    expect(session.flows.running).toBe('ask');
    await expect(session.flows.run('ask', {})).rejects.toThrow(/already running/);
    await session.flows.interrupt();
    expect(await running).toEqual({ outcome: 'interrupted', steps: 1 });
    expect(session.tasks.pending()).toEqual([]);
  });

  it('completes when the human answers the task', async () => {
    const session = await setup();
    const running = session.flows.run('ask', {});
    await new Promise((r) => setTimeout(r, 0));
    await session.tasks.submit(session.tasks.pending()[0]?.id ?? '', true);
    expect(await running).toEqual({ outcome: 'paused', steps: 1 });
  });

  it('reports failures and rejects invalid input', async () => {
    const session = await setup();
    const result = await session.flows.run('broken', {});
    expect(result.outcome).toBe('failed');
    expect(String(result.error)).toMatch(/boom/);
    await expect(session.flows.run('forever', {})).rejects.toThrow(/Invalid input/);
  });

  it('runs turn-taking: the human passes or chooses who speaks', async () => {
    const session = await setup();
    expect(await session.flows.run('turn-taking', { kind: 'choose', actorId: 'bard' })).toEqual({
      outcome: 'paused',
      steps: 1,
    });
    await session.flows.run('turn-taking', { kind: 'pass' });
    expect(session.transcript().map((m) => m.actorId)).toEqual(['bard', 'bard']);
  });
});
