import { textContent } from '@virtuocity/core';
import { spaceContract } from '@virtuocity/contract-space';
import { illustratorContract, sceneChanged } from '@virtuocity/contract-visual';
import type { Skill } from '@virtuocity/core';
import {
  IMAGE_PART,
  ModuleHost,
  SessionRuntime,
  channelContents,
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

describe('illustrator skill conforms to space', () => {
  const target = conformanceTarget(spaceContract, { skills: [illustratorSkill] });
  for (const testCase of conformanceSuite(spaceContract)) {
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
    providerId: 'scripted',
    directorId: 'least-recent',
    modelDefaults: () => ({ image: 'image-model' }),
  });
  const ended = new Promise<string>((resolve) =>
    runtime.bus.on(jobEnded, (e) => resolve(e.payload.status)),
  );
  return { runtime, ended };
}

async function play(runtime: SessionRuntime, settings?: Record<string, unknown>) {
  const actor = (id: string, skillIds: string[]) => ({
    id,
    controller: 'ai' as const,
    personality: { name: id, description: 'Ink and watercolour.' },
    skillIds,
  });
  await runtime.join(actor('narrator', ['narrator']));
  await runtime.join({ ...actor('ink', ['illustrator']), ...(settings ? { settings } : {}) });
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
    expect(picture?.kind).toBe(IMAGE_PART);
    expect(picture?.text).toContain('A lantern flickers');
    expect(runtime.calls.list()[0]?.request.messages[0]?.content).toContain('A lantern flickers');
    const scene = channelContents(runtime.workspace.view('user')).scene;
    const part = { kind: picture?.kind, data: picture?.data };
    expect(scene).toMatchObject({ actorId: 'ink', part });
    const space = await runtime.invoke('ink', spaceContract, 'fill', {});
    expect(space.parts).toEqual([part]);
  });

  it('shows the picture only as the scene when it should stay out of the story', async () => {
    const { runtime, ended } = session(() => ({ media: [png] }));
    await play(runtime, { illustrator: { inStory: false } });
    await expect(ended).resolves.toBe('done');
    expect(runtime.transcript()).toHaveLength(1);
    expect(channelContents(runtime.workspace.view('user')).scene?.part.kind).toBe(IMAGE_PART);
  });

  it('fails the job with a clear message when the model draws nothing', async () => {
    const { runtime, ended } = session(() => ({}));
    await play(runtime);
    await expect(ended).resolves.toBe('failed');
    expect(runtime.jobs.list()[0]?.error).toMatch(/Pick an image model/);
    expect(runtime.transcript()).toHaveLength(1);
  });

  it('paints an announced new scene only as the scene picture', async () => {
    const { runtime, ended } = session(() => ({ media: [png] }));
    await runtime.join({
      id: 'ink',
      controller: 'ai',
      personality: { name: 'Ink', description: '' },
      skillIds: ['illustrator'],
    });
    await runtime.bus.emit(sceneChanged.create({ description: 'A misty harbour at dawn.' }));
    await expect(ended).resolves.toBe('done');
    expect(runtime.transcript()).toHaveLength(0);
    expect(channelContents(runtime.workspace.view('user')).scene?.actorId).toBe('ink');
    expect(runtime.calls.list()[0]?.request.messages[0]?.content).toContain('misty harbour');
  });
});
