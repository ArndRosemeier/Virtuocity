import { textContent } from '@virtuocity/core';
import { premiseContract } from '@virtuocity/contract-premise';
import type { Actor, Skill } from '@virtuocity/core';
import {
  ModuleHost,
  SessionRuntime,
  conformanceSuite,
  conformanceTarget,
  coreModule,
  defineBlueprint,
  jobEnded,
  loadModules,
  scriptedProvider,
  startBlueprint,
} from '@virtuocity/core';
import { describe, expect, it } from 'vitest';
import { fixedPremiseSkill, premiseModule, promptedPremiseSkill } from './index';

const provider = () => scriptedProvider(() => 'A lighthouse keeper finds a door in the rock.');

for (const skill of [fixedPremiseSkill, promptedPremiseSkill]) {
  describe(`${skill.name} conforms to premise`, () => {
    const target = conformanceTarget(premiseContract, { skills: [skill], provider: provider() });
    for (const testCase of conformanceSuite(premiseContract)) {
      it(`${testCase.contractId}: ${testCase.name}`, () => testCase.run(target));
    }
  });
}

const quiet: Skill = {
  id: 'quiet',
  name: 'Quiet',
  backing: 'code',
  takeTurn: () => Promise.resolve(),
};
const stage = defineBlueprint({ id: 'stage', name: 'Stage', description: '', roles: [] });

function session() {
  const host = loadModules(new ModuleHost(), [coreModule, premiseModule]);
  host.skills.register(quiet);
  host.providers.register(provider());
  const runtime = new SessionRuntime({
    host,
    providerId: 'scripted',
    directorId: 'least-recent',
    modelDefaults: () => ({ text: 'text-model' }),
  });
  const ended = new Promise((resolve) => runtime.bus.on(jobEnded, (e) => resolve(e.payload)));
  return { runtime, ended };
}

const actor = (id: string, skillIds: string[], settings?: Record<string, unknown>): Actor => ({
  id,
  controller: 'ai',
  personality: { name: id, description: `${id} is here.` },
  skillIds,
  ...(settings ? { settings } : {}),
});

describe('opening a session', () => {
  it('posts the premise once the cast has joined', async () => {
    const { runtime, ended } = session();
    await startBlueprint(runtime, stage, [
      actor('premise', ['prompted-premise'], { 'prompted-premise': { prompt: 'Lighthouses' } }),
      actor('wren', ['quiet']),
    ]);
    await ended;
    const [opening] = runtime.transcript();
    expect(opening?.actorId).toBe('premise');
    expect(opening).toMatchObject(textContent('A lighthouse keeper finds a door in the rock.'));
    const request = runtime.calls.list()[0]?.request.messages[1]?.content;
    expect(request).toContain('about: Lighthouses');
    expect(request).toContain('wren: wren is here.');
  });

  it('uses a fixed premise word for word, without a model', async () => {
    const { runtime, ended } = session();
    const settings = { 'fixed-premise': { premise: 'You wake on a moving train.' } };
    await startBlueprint(runtime, stage, [actor('premise', ['fixed-premise'], settings)]);
    await ended;
    expect(runtime.transcript()[0]).toMatchObject(textContent('You wake on a moving train.'));
    expect(runtime.calls.list()).toHaveLength(0);
  });

  it('opens an empty story when it joins after the start', async () => {
    const { runtime, ended } = session();
    await startBlueprint(runtime, stage);
    const settings = { 'fixed-premise': { premise: 'You wake on a moving train.' } };
    await runtime.join(actor('premise', ['fixed-premise'], settings));
    await runtime.join(actor('premise', ['fixed-premise'], settings));
    await ended;
    expect(runtime.transcript()).toHaveLength(1);
    expect(runtime.transcript()[0]).toMatchObject(textContent('You wake on a moving train.'));
  });

  it('stays silent when it joins a story that has already begun', async () => {
    const { runtime } = session();
    await runtime.join(actor('wren', ['quiet']));
    await runtime.post('wren', textContent('Already going.'));
    await startBlueprint(runtime, stage, [actor('premise', ['fixed-premise'])]);
    expect(runtime.jobs.list()).toHaveLength(0);
    expect(runtime.transcript()).toHaveLength(1);
  });
});
