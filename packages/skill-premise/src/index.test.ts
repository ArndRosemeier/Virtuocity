import { textContent } from '@virtuocity/core';
import { premiseContract } from '@virtuocity/contract-premise';
import type { Actor, Skill } from '@virtuocity/core';
import {
  ModuleHost,
  SessionRuntime,
  conformanceSuite,
  conformanceTarget,
  coreModule,
  jobEnded,
  loadModules,
  scriptedProvider,
  startSession,
  upgradeActor,
} from '@virtuocity/core';
import { describe, expect, it } from 'vitest';
import { fixedPremiseSkill, premiseModule } from './index';

const provider = () => scriptedProvider(() => 'A lighthouse keeper finds a door in the rock.');

describe(`${fixedPremiseSkill.name} conforms to premise`, () => {
  const target = conformanceTarget(premiseContract, {
    skills: [fixedPremiseSkill],
    provider: provider(),
  });
  for (const testCase of conformanceSuite(premiseContract)) {
    it(`${testCase.contractId}: ${testCase.name}`, () => testCase.run(target));
  }
});

const quiet: Skill = {
  id: 'quiet',
  name: 'Quiet',
  backing: 'code',
  takeTurn: () => Promise.resolve(),
};

function session() {
  const host = loadModules(new ModuleHost(), [coreModule, premiseModule]);
  host.skills.register(quiet);
  host.providers.register(provider());
  const runtime = new SessionRuntime({
    host,
    modelDefaults: () => ({ text: 'scripted:text-model' }),
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
  it('uses a fixed premise word for word, without a model', async () => {
    const { runtime, ended } = session();
    const settings = { 'fixed-premise': { premise: 'You wake on a moving train.' } };
    await startSession(runtime, [actor('premise', ['fixed-premise'], settings)]);
    await ended;
    expect(runtime.transcript()[0]).toMatchObject(textContent('You wake on a moving train.'));
    expect(runtime.calls.list()).toHaveLength(0);
  });

  it('hides the premise from the people when it is not shown', async () => {
    const { runtime, ended } = session();
    const settings = { 'fixed-premise': { premise: 'The butler did it.', shown: false } };
    const you: Actor = { ...actor('you', []), controller: 'human' };
    await runtime.join(you);
    await startSession(runtime, [
      actor('premise', ['fixed-premise'], settings),
      actor('wren', ['quiet']),
    ]);
    await ended;
    expect(runtime.transcript('you')).toHaveLength(0);
    expect(runtime.transcript('wren')[0]).toMatchObject(textContent('The butler did it.'));
  });

  it('opens an empty story when it joins after the start', async () => {
    const { runtime, ended } = session();
    await startSession(runtime, []);
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
    await startSession(runtime, [actor('premise', ['fixed-premise'])]);
    expect(runtime.jobs.list()).toHaveLength(0);
    expect(runtime.transcript()).toHaveLength(1);
  });
});

describe('the removed "Premise (from a prompt)" skill', () => {
  it('becomes the Premise skill, with its prompt as the premise text', () => {
    const old = actor('premise', ['prompted-premise'], {
      'prompted-premise': { prompt: 'Lighthouses', words: 150 },
    });
    const upgraded = upgradeActor(old, [fixedPremiseSkill]);
    expect(upgraded.skillIds).toEqual(['fixed-premise']);
    expect(upgraded.settings).toEqual({ 'fixed-premise': { premise: 'Lighthouses' } });
  });
});
