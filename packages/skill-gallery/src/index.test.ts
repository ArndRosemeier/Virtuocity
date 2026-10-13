import { spaceContract } from '@virtuocity/contract-space';
import { pictureSourceContract } from '@virtuocity/contract-visual';
import type { Skill } from '@virtuocity/core';
import {
  ModuleHost,
  SessionRuntime,
  conformanceSuite,
  conformanceTarget,
  coreModule,
  loadModules,
  storeMedia,
} from '@virtuocity/core';
import { describe, expect, it } from 'vitest';
import { galleryModule, gallerySkill } from './index';

describe('gallery skill conforms to space', () => {
  const target = conformanceTarget(spaceContract, { skills: [gallerySkill] });
  for (const testCase of conformanceSuite(spaceContract)) {
    it(`${testCase.contractId}: ${testCase.name}`, () => testCase.run(target));
  }
});

describe('gallery skill conforms to picture-source', () => {
  const source = conformanceTarget(pictureSourceContract, { skills: [gallerySkill] });
  for (const testCase of conformanceSuite(pictureSourceContract)) {
    it(`${testCase.contractId}: ${testCase.name}`, () => testCase.run(source));
  }
});

/** Paints a one-byte picture per turn, each different, described by its number. */
let painted = 0;
const painter: Skill = {
  id: 'painter',
  name: 'Painter',
  backing: 'code',
  takeTurn: async (ctx) => {
    painted += 1;
    const media = [{ mime: 'image/png', bytes: new Uint8Array([painted]) }];
    const [part] = await storeMedia(ctx.assets, media, `Picture ${painted}`);
    if (part) await ctx.post(part);
  },
};

async function session(pictures: number) {
  const host = loadModules(new ModuleHost(), [coreModule, galleryModule]);
  host.skills.register(painter);
  const runtime = new SessionRuntime({ host, modelDefaults: () => ({}) });
  const actor = (id: string, skillIds: string[]) => ({
    id,
    controller: 'ai' as const,
    personality: { name: id, description: '' },
    skillIds,
  });
  await runtime.join(actor('painter', ['painter']));
  await runtime.join(actor('gallery', ['gallery']));
  for (let i = 0; i < pictures; i++) await runtime.runTurn('painter');
  return runtime;
}

const altOf = async (runtime: SessionRuntime) =>
  (await runtime.invoke('gallery', pictureSourceContract, 'current', {})).picture?.alt;

describe('a gallery', () => {
  it('shows every picture with the newest current', async () => {
    const runtime = await session(3);
    const space = await runtime.invoke('gallery', spaceContract, 'fill', {});
    expect(space.items).toHaveLength(3);
    expect(space.current).toBe(2);
    expect(space.parts).toEqual([space.items?.[2]]);
    expect(await altOf(runtime)).toMatch(/Picture \d+/);
  });

  it('makes the picture a person browsed to current, until a new one arrives', async () => {
    const runtime = await session(2);
    const first = runtime.transcript()[0];
    await runtime.invoke('gallery', spaceContract, 'browse', { to: 0 });
    const current = await runtime.invoke('gallery', pictureSourceContract, 'current', {});
    expect(current.picture?.messageId).toBe(first?.id);
    await runtime.runTurn('painter');
    const after = await runtime.invoke('gallery', spaceContract, 'fill', {});
    expect(after.current).toBe(2);
  });

  it('throws the current picture out of the story', async () => {
    const runtime = await session(2);
    const newest = runtime.transcript()[1];
    await runtime.invoke('gallery', spaceContract, 'discard', {});
    expect(runtime.transcript().map((m) => m.id)).not.toContain(newest?.id);
    const after = await runtime.invoke('gallery', spaceContract, 'fill', {});
    expect(after.items).toHaveLength(1);
    expect(after.current).toBe(0);
  });

  it('names no picture while there is none', async () => {
    const runtime = await session(0);
    expect(await altOf(runtime)).toBeUndefined();
    const space = await runtime.invoke('gallery', spaceContract, 'fill', {});
    expect(space).toEqual({ parts: [], items: [] });
  });
});
