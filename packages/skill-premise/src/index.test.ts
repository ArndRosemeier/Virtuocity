import { textContent } from '@virtuocity/core';
import { premiseContract } from '@virtuocity/contract-premise';
import type { Actor, Skill } from '@virtuocity/core';
import {
  ModuleHost,
  SessionRuntime,
  conformanceSuite,
  conformanceTarget,
  coreModule,
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
  return new SessionRuntime({
    host,
    modelDefaults: () => ({ text: 'scripted:text-model' }),
  });
}

const actor = (id: string, skillIds: string[], settings?: Record<string, unknown>): Actor => ({
  id,
  controller: 'ai',
  personality: { name: id, description: `${id} is here.` },
  skillIds,
  ...(settings ? { settings } : {}),
});

const premise = (text: string, shown = true) =>
  actor('premise', ['fixed-premise'], { 'fixed-premise': { premise: text, shown } });
const you: Actor = { ...actor('you', []), controller: 'human' };
const act = (runtime: SessionRuntime) => runtime.post('you', textContent('I look around.'));

describe('opening a session', () => {
  it('waits for the first step, then opens with the premise word for word', async () => {
    const runtime = session();
    await startSession(runtime, [you, premise('You wake on a moving train.')]);
    expect(runtime.transcript()).toHaveLength(0);
    await act(runtime);
    expect(runtime.transcript()[0]).toMatchObject(textContent('You wake on a moving train.'));
    expect(runtime.transcript()[1]).toMatchObject(textContent('I look around.'));
    expect(runtime.calls.list()).toHaveLength(0);
  });

  it('uses the premise as it is at the first step, not as it was at the start', async () => {
    const runtime = session();
    await startSession(runtime, [you, premise('You wake on a moving train.')]);
    await runtime.join(premise('You wake in a lighthouse.'));
    await act(runtime);
    expect(runtime.transcript()[0]).toMatchObject(textContent('You wake in a lighthouse.'));
    expect(runtime.transcript()).toHaveLength(2);
  });

  it('hides the premise from the people when it is not shown', async () => {
    const runtime = session();
    await startSession(runtime, [
      you,
      premise('The butler did it.', false),
      actor('wren', ['quiet']),
    ]);
    await runtime.runTurn('wren');
    expect(runtime.transcript('you')).toHaveLength(0);
    expect(runtime.transcript('wren')[0]).toMatchObject(textContent('The butler did it.'));
    expect(runtime.transcript('wren')[0]?.hiddenFrom).toEqual(['you']);
  });

  it('stays silent when it joins a session that has already begun', async () => {
    const runtime = session();
    await startSession(runtime, [you]);
    await act(runtime);
    await runtime.join(premise('You wake on a moving train.'));
    await act(runtime);
    expect(runtime.transcript().map((m) => m.actorId)).toEqual(['you', 'you']);
  });

  it('holds the first step back, with the reason, while it has no premise', async () => {
    const runtime = session();
    await startSession(runtime, [you, premise('  ')]);
    await expect(act(runtime)).rejects.toThrow('Write the premise');
    expect(runtime.transcript()).toHaveLength(0);
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
