import {
  SESSION_FIGURES,
  SESSION_OUTLINE,
  sessionAnalyticsContract,
} from '@virtuocity/contract-analytics';
import { markerContract } from '@virtuocity/contract-render';
import { spaceContract } from '@virtuocity/contract-space';
import type { Skill } from '@virtuocity/core';
import {
  ModuleHost,
  SessionRuntime,
  conformanceSuite,
  conformanceTarget,
  coreModule,
  implement,
  loadModules,
  textContent,
} from '@virtuocity/core';
import { describe, expect, it } from 'vitest';
import { sessionAnalyticsModule, sessionAnalyticsSkill } from './index';

describe('session analytics conforms to session-analytics', () => {
  const target = conformanceTarget(sessionAnalyticsContract, { skills: [sessionAnalyticsSkill] });
  for (const testCase of conformanceSuite(sessionAnalyticsContract)) {
    it(`${testCase.contractId}: ${testCase.name}`, () => testCase.run(target));
  }
});

describe('session analytics conforms to space', () => {
  const target = conformanceTarget(spaceContract, { skills: [sessionAnalyticsSkill] });
  for (const testCase of conformanceSuite(spaceContract)) {
    it(`${testCase.contractId}: ${testCase.name}`, () => testCase.run(target));
  }
});

const narrator: Skill = {
  id: 'narrator',
  name: 'Narrator',
  backing: 'code',
  takeTurn: async (ctx) => {
    await ctx.post(textContent('The gate creaks open.'));
  },
};

const marking: Skill = {
  id: 'marking',
  name: 'Marking',
  backing: 'code',
  implements: [
    implement(markerContract, {
      markers: (_input, ctx) =>
        Promise.resolve({
          markers: ctx.transcript.slice(0, 1).map((m) => ({ afterId: m.id, label: 'Summarized' })),
        }),
    }),
  ],
};

async function session(settings?: Record<string, unknown>) {
  const host = loadModules(new ModuleHost(), [coreModule, sessionAnalyticsModule]);
  host.skills.register(narrator);
  host.skills.register(marking);
  const runtime = new SessionRuntime({ host, modelDefaults: () => ({}) });
  const actor = (id: string, skillIds: string[]) => ({
    id,
    controller: 'ai' as const,
    personality: { name: id, description: '' },
    skillIds,
  });
  await runtime.join(actor('Narrator', ['narrator']));
  await runtime.join({
    ...actor('Analytics', ['session-analytics']),
    ...(settings ? { settings } : {}),
  });
  await runtime.runTurn('Narrator');
  const space = () => runtime.invoke('Analytics', spaceContract, 'fill', {});
  return { runtime, space };
}

describe('analysing the session', () => {
  it('shows the markers actors place, e.g. where the last summary is', async () => {
    const { runtime, space } = await session();
    await runtime.join({
      id: 'Scribe',
      controller: 'ai',
      personality: { name: 'Scribe', description: '' },
      skillIds: ['marking'],
    });
    await runtime.runTurn('Analytics');
    const [, part] = (await space()).parts;
    const rows = (part?.data as { rows: { type: string; title: string }[] }).rows;
    expect(rows.map((r) => [r.type, r.title])).toEqual([
      ['ai', 'Narrator · Text by an AI actor'],
      ['marker', 'Scribe · Summarized'],
    ]);
  });

  it('waits to be asked by default, and is support, not cast', async () => {
    const { runtime, space } = await session();
    expect((await space()).parts).toEqual([]);
    expect(runtime.cast().map((a) => a.id)).toEqual(['Narrator']);
    expect(runtime.askable().map((a) => a.id)).toEqual(['Analytics']);
  });

  it('shows one line per post once asked', async () => {
    const { runtime, space } = await session();
    await runtime.runTurn('Analytics');
    const [figures, part] = (await space()).parts;
    expect(part?.kind).toBe(SESSION_OUTLINE);
    expect(part?.data).toEqual({
      rows: [
        {
          messageId: expect.any(String) as unknown,
          type: 'ai',
          title: 'Narrator · Text by an AI actor',
        },
      ],
    });
    expect(figures?.kind).toBe(SESSION_FIGURES);
    expect(runtime.transcript()).toHaveLength(1);
  });

  it('updates after every new post when automatic', async () => {
    const { runtime, space } = await session({ 'session-analytics': { automatic: true } });
    await runtime.runTurn('Narrator');
    const [, part] = (await space()).parts;
    expect((part?.data as { rows: unknown[] }).rows).toHaveLength(2);
  });

  it('empties its space when discarded, and looks again on retry', async () => {
    const { runtime, space } = await session();
    await runtime.runTurn('Analytics');
    await runtime.invoke('Analytics', spaceContract, 'discard', {});
    expect((await space()).parts).toEqual([]);
    await runtime.invoke('Analytics', spaceContract, 'redo', {});
    expect((await space()).parts).toHaveLength(2);
  });
});
