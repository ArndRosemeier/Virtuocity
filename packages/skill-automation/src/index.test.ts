import { automationContract } from '@virtuocity/contract-automation';
import type { CompletionRequest, Skill } from '@virtuocity/core';
import {
  ModuleHost,
  SessionRuntime,
  conformanceSuite,
  conformanceTarget,
  coreModule,
  jobEnded,
  loadModules,
  scriptedProvider,
  textContent,
} from '@virtuocity/core';
import { describe, expect, it } from 'vitest';
import { automationModule, automationSkill, keptValues } from './index';
import { automationSettings, due } from './settings';

describe('automation skill conforms to automation', () => {
  const target = conformanceTarget(automationContract, {
    skills: [automationSkill],
    provider: scriptedProvider(() => 'An answer.'),
  });
  for (const testCase of conformanceSuite(automationContract)) {
    it(`${testCase.contractId}: ${testCase.name}`, () => testCase.run(target));
  }
});

const narrator: Skill = {
  id: 'narrator',
  name: 'Narrator',
  backing: 'code',
  takeTurn: async (ctx) => {
    await ctx.post(textContent('A lantern flickers in the rain.'));
  },
};

const prompt = (request: CompletionRequest) => String(request.messages.at(-1)?.content ?? '');

function session() {
  const host = loadModules(new ModuleHost(), [coreModule, automationModule]);
  host.skills.register(narrator);
  host.providers.register(scriptedProvider((request) => `(${prompt(request)})`));
  const runtime = new SessionRuntime({ host, modelDefaults: () => ({ text: 'scripted:m' }) });
  return runtime;
}

async function play(runtime: SessionRuntime, settings: Record<string, unknown>) {
  const actor = (id: string, skillIds: string[]) => ({
    id,
    controller: 'ai' as const,
    personality: { name: id, description: '' },
    skillIds,
  });
  await runtime.join(actor('narrator', ['narrator']));
  await runtime.join({ ...actor('bot', ['automation']), settings: { automation: settings } });
  await runtime.runTurn('narrator');
}

describe('an automation', () => {
  it('runs only when asked unless "automatic" is switched on, like an illustrator', () => {
    expect(automationSettings.parse({}).automatic).toBe(false);
  });

  it('ships an example script that runs', () => {
    expect(automationSkill.checkSettings?.(undefined)).toEqual([]);
  });

  it('reports a broken script when the actor is saved', () => {
    expect(automationSkill.checkSettings?.({ script: 'LLM("[nope]")' })).toEqual([
      'Line 1: [nope] is not set yet; set it on an earlier line with nope = LLM("...")',
    ]);
  });

  it('posts one message when picked, with the story so far as [context]', async () => {
    const runtime = session();
    await play(runtime, { script: 'a = LLM("Mood of: [context]")\nLLM("Twist for [a]")' });
    expect(runtime.askable().map((a) => a.id)).toEqual(['bot']);
    await runtime.runTurn('bot');
    const posted = runtime.transcript().at(-1);
    expect(posted?.actorId).toBe('bot');
    expect(posted?.text).toBe('(Twist for (Mood of: narrator: A lantern flickers in the rain.))');
    expect(posted?.stats).toHaveLength(2);
  });

  it('keeps _ variables from one run to the next, and forgets the others', async () => {
    const runtime = session();
    await play(runtime, { script: 'x = LLM("x")\nLLM("[_n]")\n_n = LLM("+[_n]")' });
    await runtime.runTurn('bot');
    await runtime.runTurn('bot');
    expect(runtime.transcript().at(-1)?.text).toBe('((+))');
    expect(keptValues(runtime.workspace.view('bot'), 'bot')).toEqual({ _n: '(+(+))' });
  });

  it('runs in the background after others’ turns with "automatic" on', async () => {
    const runtime = session();
    const ended = new Promise<string>((resolve) =>
      runtime.bus.on(jobEnded, (e) => resolve(e.payload.status)),
    );
    await play(runtime, { automatic: true, script: 'LLM("hi")' });
    await expect(ended).resolves.toBe('done');
    expect(runtime.transcript().map((m) => m.text)).toEqual([
      'A lantern flickers in the rain.',
      '(hi)',
    ]);
  });
});

describe('due', () => {
  const said = (actorId: string, text = 'words') => ({
    id: `${actorId}-${Math.random()}`,
    actorId,
    createdAt: 0,
    ...textContent(text),
  });

  it('runs every n messages from others since its own last post', () => {
    const story = [said('bot'), said('a'), said('b')];
    expect(due(story, 'bot', 'b', 1)).toBe(true);
    expect(due(story, 'bot', 'b', 2)).toBe(true);
    expect(due(story, 'bot', 'b', 3)).toBe(false);
    expect(due(story, 'bot', 'bot', 1)).toBe(false);
    expect(due([...story, said('c', ' ')], 'bot', 'c', 3)).toBe(false);
  });
});
