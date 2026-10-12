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
    await ctx.post([{ kind: 'text', data: 'A lantern flickers in the rain.' }]);
  },
};

function session(reply: () => { media?: (typeof png)[] }) {
  const host = loadModules(new ModuleHost(), [coreModule]);
  host.skills.register(narrator);
  host.skills.register(illustratorSkill);
  host.providers.register(scriptedProvider(reply));
  const runtime = new SessionRuntime({
    host,
    providerId: 'scripted',
    directorId: 'least-recent',
    modelDefaults: () => ({ image: 'image-model' }),
  });
  const ended = new Promise<string>((resolve) =>
    runtime.bus.on(jobEnded, (e) => resolve(e.payload.status)),
  );
  return { runtime, ended };
}

async function play(runtime: SessionRuntime) {
  const actor = (id: string, skillIds: string[]) => ({
    id,
    controller: 'ai' as const,
    personality: { name: id, description: 'Ink and watercolour.' },
    skillIds,
  });
  await runtime.join(actor('narrator', ['narrator']));
  await runtime.join(actor('ink', ['illustrator']));
  await runtime.runTurn('narrator');
}

describe('illustrating a scene', () => {
  it('draws each turn in the background and posts the picture', async () => {
    const { runtime, ended } = session(() => ({ media: [png] }));
    await play(runtime);
    expect(runtime.transcript()).toHaveLength(1);
    expect(runtime.jobs.running().map((j) => j.label)).toEqual(['Illustrating the scene']);
    await expect(ended).resolves.toBe('done');
    const picture = runtime.transcript().at(-1);
    expect(picture?.actorId).toBe('ink');
    expect(picture?.parts[0]?.kind).toBe(IMAGE_PART);
    expect(runtime.calls.list()[0]?.request.messages[0]?.content).toContain('A lantern flickers');
  });

  it('fails the job with a clear message when the model draws nothing', async () => {
    const { runtime, ended } = session(() => ({}));
    await play(runtime);
    await expect(ended).resolves.toBe('failed');
    expect(runtime.jobs.list()[0]?.error).toMatch(/Pick an image model/);
    expect(runtime.transcript()).toHaveLength(1);
  });
});
