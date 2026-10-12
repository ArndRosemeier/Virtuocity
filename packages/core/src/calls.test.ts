import { textContent } from './output';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import type { Actor } from './actor';
import { CallLog, callEnded, callProgressed } from './calls';
import { action, defineContract } from './contract';
import { coreModule } from './core-module';
import { EventBus } from './events';
import { implement } from './implementation';
import { ModuleHost, loadModules } from './module';
import type { CompletionRequest } from './provider';
import { SessionRuntime } from './runtime';
import type { Skill } from './skill';
import { scriptedProvider } from './testing';
import { completeWithTools } from './tools';

const request: CompletionRequest = { modality: 'text', model: 'm', messages: [] };

function log(limit?: number) {
  let n = 0;
  const bus = new EventBus();
  const options = { bus, newId: () => `call-${++n}`, now: () => n, ...(limit ? { limit } : {}) };
  return { bus, calls: new CallLog(options) };
}

describe('CallLog', () => {
  it('records streamed text, the result and events', async () => {
    const { bus, calls } = log();
    const seen: string[] = [];
    bus.on('*', (e) => void seen.push(e.type));
    const streamed: string[] = [];
    const provider = scriptedProvider(['Hello there friend']);
    const result = await calls.track(
      { actorId: 'a', skillId: 's' },
      { ...request, onText: (d) => streamed.push(d) },
      (r) => {
        const promise = provider.complete(r);
        return promise;
      },
    );
    expect(result.text).toBe('Hello there friend');
    expect(streamed.join('')).toBe('Hello there friend');
    expect(calls.list()).toMatchObject([
      { id: 'call-1', actorId: 'a', status: 'done', text: 'Hello there friend' },
    ]);
    expect(seen.filter((t) => t === callProgressed.type)).toHaveLength(3);
    expect(seen.at(-1)).toBe(callEnded.type);
  });

  it('marks failures and cancellations', async () => {
    const { calls } = log();
    const meta = { actorId: 'a', skillId: 's' };
    await expect(
      calls.track(meta, request, () => Promise.reject(new Error('boom'))),
    ).rejects.toThrow('boom');
    const controller = new AbortController();
    controller.abort();
    const cancelled = calls.track(meta, { ...request, signal: controller.signal }, () =>
      Promise.reject(new Error('aborted')),
    );
    await expect(cancelled).rejects.toThrow();
    expect(calls.list().map((t) => [t.status, t.error])).toEqual([
      ['failed', 'Error: boom'],
      ['cancelled', 'Error: aborted'],
    ]);
  });

  it('keeps only the most recent finished calls', async () => {
    const { calls } = log(2);
    const provider = scriptedProvider(['a', 'b', 'c']);
    for (let i = 0; i < 3; i++) {
      await calls.track({ actorId: 'a', skillId: 's' }, request, (r) => provider.complete(r));
    }
    expect(calls.list().map((t) => t.text)).toEqual(['b', 'c']);
  });
});

const dice = defineContract({
  name: 'dice',
  version: '1.0',
  description: 'Rolls dice',
  actions: {
    roll: action({
      description: 'Roll a die',
      input: z.object({ sides: z.number() }),
      output: z.number(),
    }),
  },
});
const diceSkill: Skill = {
  id: 'dice',
  name: 'Dice',
  backing: 'code',
  implements: [implement(dice, { roll: ({ sides }) => Promise.resolve(sides) })],
};
const talker: Skill = {
  id: 'talker',
  name: 'Talker',
  backing: 'llm',
  async takeTurn(ctx) {
    const messages = [{ role: 'user' as const, content: 'Roll' }];
    const { result } = await completeWithTools(
      ctx.complete,
      { modality: 'text', messages },
      ctx.tools,
    );
    await ctx.post(textContent(result.text), [result.stats]);
  },
};

describe('model calls in a session', () => {
  it('traces every call and lets skills use the actor’s other skills as tools', async () => {
    const host = loadModules(new ModuleHost(), [coreModule]);
    host.skills.register(diceSkill);
    host.skills.register(talker);
    host.providers.register(
      scriptedProvider([
        { toolCalls: [{ id: 't', name: 'dice_roll', arguments: '{"sides": 20}' }] },
        'A 20!',
      ]),
    );
    const session = new SessionRuntime({
      host,
      directorId: 'least-recent',
      modelDefaults: () => ({ text: 'scripted:m' }),
    });
    const bard: Actor = {
      id: 'bard',
      controller: 'ai',
      personality: { name: 'Bard', description: '' },
      skillIds: ['talker', 'dice'],
    };
    await session.join(bard);
    await session.runTurn('bard');
    expect(session.transcript().at(-1)).toMatchObject(textContent('A 20!'));
    expect(session.calls.list().map((t) => [t.actorId, t.skillId, t.status])).toEqual([
      ['bard', 'talker', 'done'],
      ['bard', 'talker', 'done'],
    ]);
    expect(session.calls.list()[1]?.request.messages.at(-1)).toEqual({
      role: 'tool',
      toolCallId: 't',
      content: '20',
    });
    expect(session.allStats()).toHaveLength(2);
  });
});
