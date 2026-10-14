import { textContent } from '@virtuocity/core';
import { illustratorContract } from '@virtuocity/contract-visual';
import type { Skill } from '@virtuocity/core';
import {
  IMAGE_PART,
  ModuleHost,
  SessionRuntime,
  conformanceSuite,
  conformanceTarget,
  coreModule,
  jobEnded,
  loadModules,
  scriptedProvider,
} from '@virtuocity/core';
import { describe, expect, it } from 'vitest';
import { illustratorSkill } from './index';
import { illustratorSettings } from './prompt';

const png = { mime: 'image/png', bytes: new Uint8Array([137, 80, 78, 71]) };

describe('illustrator skill conforms to illustrator', () => {
  const provider = scriptedProvider(() => ({ media: [png] }));
  const target = conformanceTarget(illustratorContract, {
    skills: [illustratorSkill],
    provider,
    modelDefaults: { image: 'image-model' },
  });
  for (const testCase of conformanceSuite(illustratorContract)) {
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

function session(reply: () => { media?: (typeof png)[] }) {
  const host = loadModules(new ModuleHost(), [coreModule]);
  host.skills.register(narrator);
  host.skills.register(illustratorSkill);
  host.providers.register(scriptedProvider(reply));
  const runtime = new SessionRuntime({
    host,
    modelDefaults: () => ({ image: 'scripted:image-model' }),
  });
  const ended = new Promise<string>((resolve) =>
    runtime.bus.on(jobEnded, (e) => resolve(e.payload.status)),
  );
  return { runtime, ended };
}

/** A narrator's turn, with an illustrator painting on its own unless `illustrator` says otherwise. */
async function play(runtime: SessionRuntime, illustrator: Record<string, unknown> = {}) {
  const actor = (id: string, skillIds: string[]) => ({
    id,
    controller: 'ai' as const,
    personality: { name: id, description: 'Ink and watercolour.' },
    skillIds,
  });
  await runtime.join(actor('narrator', ['narrator']));
  const settings = { illustrator: { automatic: true, ...illustrator } };
  await runtime.join({ ...actor('ink', ['illustrator']), settings });
  await runtime.runTurn('narrator');
}

describe('an illustrator', () => {
  it('has no space of its own: its pictures are in the session, and a gallery browses them', () => {
    const contracts = (illustratorSkill.implements ?? []).map((i) => i.contract.name);
    expect(contracts).toEqual([illustratorContract.name]);
  });

  it('paints only when asked unless "Paint on its own" is switched on, since pictures cost', () => {
    expect(illustratorSettings.parse({}).automatic).toBe(false);
  });
});

describe('illustrating a scene', () => {
  it('draws each turn in the background and posts the picture', async () => {
    const { runtime, ended } = session(() => ({ media: [png] }));
    await play(runtime);
    expect(runtime.transcript()).toHaveLength(1);
    expect(runtime.jobs.running().map((j) => j.label)).toEqual(['Illustrating the scene']);
    await expect(ended).resolves.toBe('done');
    const picture = runtime.transcript().at(-1);
    expect(picture?.actorId).toBe('ink');
    expect(picture?.kind).toBe(IMAGE_PART);
    expect(picture?.text).toContain('A lantern flickers');
    expect(runtime.calls.list()[0]?.request.messages[0]?.content).toContain('A lantern flickers');
  });

  it('fails the job with a clear message when the model draws nothing', async () => {
    const { runtime, ended } = session(() => ({}));
    await play(runtime);
    await expect(ended).resolves.toBe('failed');
    expect(runtime.jobs.list()[0]?.error).toMatch(/Pick an image model/);
    expect(runtime.transcript()).toHaveLength(1);
  });

  it('paints only when picked once automatic is off, from the newest message', async () => {
    const { runtime } = session(() => ({ media: [png] }));
    await play(runtime, { automatic: false });
    expect(runtime.jobs.running()).toEqual([]);
    expect(runtime.speakers().map((a) => a.id)).toEqual(['narrator']);
    expect(runtime.askable().map((a) => a.id)).toEqual(['ink']);
    expect(runtime.cast().map((a) => a.id)).toEqual(['narrator']);
    await runtime.runTurn('ink');
    const picture = runtime.transcript().at(-1);
    expect(picture?.kind).toBe(IMAGE_PART);
    expect(runtime.calls.list()[0]?.request.messages[0]?.content).toContain('A lantern flickers');
  });

  it('asks for something to paint when the story is empty', async () => {
    const { runtime } = session(() => ({ media: [png] }));
    await runtime.join({
      id: 'ink',
      controller: 'ai',
      personality: { name: 'Ink', description: '' },
      skillIds: ['illustrator'],
    });
    await expect(runtime.runTurn('ink')).rejects.toThrow(/Nothing to paint yet/);
  });
});
