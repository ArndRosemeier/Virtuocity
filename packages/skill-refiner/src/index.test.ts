import { refinerContract } from '@virtuocity/contract-refiner';
import type { CompletionRequest, Skill } from '@virtuocity/core';
import {
  ModuleHost,
  SessionRuntime,
  conformanceSuite,
  conformanceTarget,
  coreModule,
  loadModules,
  scriptedProvider,
  textContent,
} from '@virtuocity/core';
import { describe, expect, it } from 'vitest';
import { ANSWER_ONLY, refinerModule, refinerSkill } from './index';

const REFINED = 'The fox leaps over the fence.';

describe('refiner conforms to refiner', () => {
  const target = conformanceTarget(refinerContract, {
    skills: [refinerSkill],
    provider: scriptedProvider(() => REFINED),
    modelDefaults: { text: 'text-model' },
  });
  for (const testCase of conformanceSuite(refinerContract)) {
    it(`${testCase.contractId}: ${testCase.name}`, () => testCase.run(target));
  }
});

const narrator: Skill = {
  id: 'narrator',
  name: 'Narrator',
  backing: 'code',
  takeTurn: async (ctx) => {
    await ctx.post(textContent('A fence blocks the path.'));
  },
};

async function session(settings?: Record<string, unknown>, answer = REFINED) {
  const host = loadModules(new ModuleHost(), [coreModule, refinerModule]);
  host.skills.register(narrator);
  const requests: CompletionRequest[] = [];
  host.providers.register(scriptedProvider((request) => (requests.push(request), answer)));
  const runtime = new SessionRuntime({ host, modelDefaults: () => ({ text: 'scripted:m' }) });
  const actor = (id: string, skillIds: string[]) => ({
    id,
    controller: 'ai' as const,
    personality: { name: id, description: '' },
    skillIds,
  });
  await runtime.join(actor('Narrator', ['narrator']));
  await runtime.join({ ...actor('Refiner', ['refiner']), ...(settings ? { settings } : {}) });
  await runtime.runTurn('Narrator');
  const refine = (text: string) =>
    runtime.invoke('Refiner', refinerContract, 'refine', { draft: textContent(text) });
  return { runtime, requests, refine };
}

describe('refining a draft', () => {
  it('is neither cast nor askable, so nothing but the input box triggers it', async () => {
    const { runtime, requests } = await session();
    expect(runtime.cast().map((a) => a.id)).toEqual(['Narrator']);
    expect(runtime.askable()).toEqual([]);
    expect(runtime.speakers().map((a) => a.id)).toEqual(['Narrator']);
    expect(requests).toEqual([]);
  });

  it('appends the draft to the default command, with the session as context', async () => {
    const { runtime, requests, refine } = await session();
    await expect(refine('the fox jump fence')).resolves.toEqual({ draft: textContent(REFINED) });
    expect(requests[0]?.messages[0]?.content).toContain('Narrator: A fence blocks the path.');
    expect(requests[0]?.messages[1]?.content).toBe('Please refine this text: the fox jump fence');
    expect(runtime.transcript()).toHaveLength(1);
  });

  it('uses the command set on the actor and leaves the session out when asked', async () => {
    const settings = { refiner: { command: 'Make it shorter: ', context: false } };
    const { requests, refine } = await session(settings);
    await refine('a very long line');
    expect(requests[0]?.messages[0]?.content).toBe(ANSWER_ONLY);
    expect(requests[0]?.messages[1]?.content).toBe('Make it shorter: a very long line');
  });

  it('fails when the model returns nothing', async () => {
    const { refine } = await session(undefined, '  ');
    await expect(refine('hello')).rejects.toThrow('no text');
  });
});
