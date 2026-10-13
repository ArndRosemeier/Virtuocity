import { factGathererContract } from '@virtuocity/contract-facts';
import { spaceContract } from '@virtuocity/contract-space';
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
import { DEFAULT_FACTS_PROMPT, factGathererModule, factGathererSkill } from './index';

const FACTS = '## People\n- Wren carries a map.';

describe('fact gatherer conforms to fact-gatherer', () => {
  const target = conformanceTarget(factGathererContract, {
    skills: [factGathererSkill],
    provider: scriptedProvider(() => FACTS),
    modelDefaults: { text: 'text-model' },
  });
  for (const testCase of conformanceSuite(factGathererContract)) {
    it(`${testCase.contractId}: ${testCase.name}`, () => testCase.run(target));
  }
});

describe('fact gatherer conforms to space', () => {
  const target = conformanceTarget(spaceContract, { skills: [factGathererSkill] });
  for (const testCase of conformanceSuite(spaceContract)) {
    it(`${testCase.contractId}: ${testCase.name}`, () => testCase.run(target));
  }
});

const narrator: Skill = {
  id: 'narrator',
  name: 'Narrator',
  backing: 'code',
  takeTurn: async (ctx) => {
    await ctx.post(textContent('Wren hides the map under her cloak.'));
  },
};

async function session(settings?: Record<string, unknown>) {
  const host = loadModules(new ModuleHost(), [coreModule, factGathererModule]);
  host.skills.register(narrator);
  const requests: CompletionRequest[] = [];
  host.providers.register(scriptedProvider((request) => (requests.push(request), FACTS)));
  const runtime = new SessionRuntime({ host, modelDefaults: () => ({ text: 'scripted:m' }) });
  const ended = new Promise<string>((resolve) =>
    runtime.bus.on(jobEnded, (e) => resolve(e.payload.status)),
  );
  const actor = (id: string, skillIds: string[]) => ({
    id,
    controller: 'ai' as const,
    personality: { name: id, description: '' },
    skillIds,
  });
  await runtime.join(actor('Narrator', ['narrator']));
  await runtime.join({ ...actor('Facts', ['fact-gatherer']), ...(settings ? { settings } : {}) });
  await runtime.runTurn('Narrator');
  const space = () => runtime.invoke('Facts', spaceContract, 'fill', {});
  return { runtime, requests, ended, space };
}

const factsPart = { kind: 'text', data: FACTS };

describe('gathering facts', () => {
  it('waits to be asked by default, and is support, not cast', async () => {
    const { runtime, requests, space } = await session();
    expect(runtime.jobs.list()).toEqual([]);
    expect(requests).toEqual([]);
    expect((await space()).parts).toEqual([]);
    expect(runtime.cast().map((a) => a.id)).toEqual(['Narrator']);
    expect(runtime.askable().map((a) => a.id)).toEqual(['Facts']);
  });

  it('reads the whole session with its prompt when asked, and shows the facts in its space', async () => {
    const { runtime, requests, space } = await session();
    await runtime.runTurn('Facts');
    expect(requests[0]?.messages[0]?.content).toBe(DEFAULT_FACTS_PROMPT);
    expect(requests[0]?.messages[1]?.content).toContain(
      'Narrator: Wren hides the map under her cloak.',
    );
    expect((await space()).parts).toEqual([factsPart]);
    expect(runtime.transcript()).toHaveLength(1);
  });

  it('uses the prompt set on the actor', async () => {
    const { runtime, requests } = await session({ 'fact-gatherer': { prompt: 'List places.' } });
    await runtime.runTurn('Facts');
    expect(requests[0]?.messages[0]?.content).toBe('List places.');
  });

  it('gathers in the background after turns when automatic', async () => {
    const { runtime, ended, space } = await session({ 'fact-gatherer': { automatic: true } });
    expect(runtime.jobs.running().map((j) => j.label)).toEqual(['Gathering facts']);
    await expect(ended).resolves.toBe('done');
    expect((await space()).parts).toEqual([factsPart]);
  });

  it('keeps a person’s corrections in front of the model', async () => {
    const { runtime, requests } = await session();
    const corrected = [{ kind: 'text', data: 'Wren burned the map.' }];
    await runtime.invoke('Facts', spaceContract, 'edit', { parts: corrected });
    await runtime.runTurn('Facts');
    expect(requests[0]?.messages[1]?.content).toContain('Wren burned the map.');
  });

  it('throws the facts away, and gathers them again on retry', async () => {
    const { runtime, requests, space } = await session();
    await runtime.runTurn('Facts');
    await expect(runtime.invoke('Facts', spaceContract, 'discard', {})).resolves.toEqual({
      parts: [],
    });
    await expect(runtime.invoke('Facts', spaceContract, 'redo', {})).resolves.toEqual({
      parts: [factsPart],
    });
    expect(requests).toHaveLength(2);
    expect((await space()).parts).toEqual([factsPart]);
  });
});
