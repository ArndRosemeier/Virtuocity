import { describe, expect, it } from 'vitest';
import type { Actor } from './actor';
import { coreModule } from './core-module';
import type { DecisionRequest } from './decisions';
import { chosen } from './decisions';
import { ModuleHost, loadModules } from './module';
import { textContent } from './output';
import type { ModelProvider } from './provider';
import { SessionRuntime } from './runtime';
import type { Skill } from './skill';

const asked: DecisionRequest[] = [];
const decider: ModelProvider = {
  id: 'fake',
  name: 'Fake',
  ready: () => true,
  complete: () => Promise.reject(new Error('not a chat model')),
  decide: (request) => {
    asked.push(request);
    return Promise.resolve({
      answers: { mood: { type: 'choice', choice: 'calm', probabilities: { calm: 0.9 } } },
      stats: { model: request.model, promptTokens: 12, completionTokens: 0, costUsd: 0.001 },
    });
  },
};
const chatOnly: ModelProvider = {
  id: 'chat',
  name: 'Chat only',
  ready: () => true,
  complete: decider.complete,
};

/** Asks the decisions model about the mood and posts what it chose. */
const judge: Skill = {
  id: 'judge',
  name: 'Judge',
  backing: 'llm',
  modalities: ['decisions'],
  onRequest: async (ctx) => {
    const result = await ctx.decide({
      state: { story: 'The rain stopped.' },
      questions: {
        mood: {
          type: 'choice',
          instructions: 'What is the mood?',
          criteria: { calm: '', tense: '' },
        },
      },
    });
    await ctx.post(textContent(chosen(result, 'mood') ?? 'none'));
  },
};

function setup(model: string) {
  const host = loadModules(new ModuleHost(), [coreModule]);
  host.skills.register(judge);
  host.providers.register(decider);
  host.providers.register(chatOnly);
  return new SessionRuntime({ host, modelDefaults: () => ({ decisions: model }) });
}

const actor: Actor = {
  id: 'j',
  controller: 'ai',
  personality: { name: 'Judge', description: '' },
  skillIds: ['judge'],
};

describe('decision calls', () => {
  it('runs on the decisions model, traced and counted like any call', async () => {
    const session = setup('fake:jev');
    await session.join(actor);
    await session.runTurn('j');
    expect(session.transcript().map((m) => m.text)).toEqual(['calm']);
    expect(asked.at(-1)?.model).toBe('jev');
    const [trace] = session.calls.list();
    expect(trace?.request.modality).toBe('decisions');
    expect(trace?.request.messages[0]?.content).toContain('The rain stopped.');
    expect(trace?.text).toContain('"choice": "calm"');
    expect(session.allStats().map((s) => s.costUsd)).toEqual([0.001]);
  });

  it('fails when the provider has no decision models', async () => {
    const session = setup('chat:something');
    await session.join(actor);
    await expect(session.runTurn('j')).rejects.toThrow(/Chat only cannot run decision models/);
  });
});
