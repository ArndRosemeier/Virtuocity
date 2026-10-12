import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import type { Actor } from './actor';
import { castContributor } from './cast';
import type { ContextPiece } from './context-assembly';
import { assembleContext, estimateTokens, fitNewest } from './context-assembly';
import { coreModule } from './core-module';
import { ModuleHost, loadModules } from './module';
import { SessionRuntime } from './runtime';
import { defineProfileField } from './settings';
import type { Skill } from './skill';
import type { AssembledContext } from './context-assembly';
import { scriptedProvider } from './testing';

const piece = (id: string, priority: number, chars: number): ContextPiece => ({
  id,
  title: id,
  text: 'x'.repeat(chars),
  priority,
});

describe('assembleContext', () => {
  it('keeps the most important pieces that fit and skips the rest', () => {
    const result = assembleContext(
      [
        piece('lore', 10, 400),
        piece('cast', 80, 40),
        piece('outline', 40, 4000),
        piece('mood', 5, 20),
      ],
      200,
    );
    expect(result.pieces.map((p) => p.id)).toEqual(['cast', 'lore', 'mood']);
    expect(result.dropped).toEqual(['outline']);
    expect(result.tokens).toBeLessThanOrEqual(200);
    expect(result.text).toMatch(/^## cast\n/);
  });

  it('estimates about four characters per token', () => {
    expect(estimateTokens('abcdefgh')).toBe(2);
  });
});

describe('fitNewest', () => {
  it('keeps the newest items within the budget, in order', () => {
    expect(fitNewest([5, 4, 3, 2, 1], 6, (n) => n)).toEqual([3, 2, 1]);
    expect(fitNewest([10], 5, (n) => n)).toEqual([]);
  });
});

const looks = defineProfileField({
  id: 'looks',
  label: 'Looks',
  description: '',
  schema: z.string(),
});

const actor = (id: string, profile?: Record<string, unknown>): Actor => ({
  id,
  controller: 'ai',
  personality: { name: id.toUpperCase(), description: `${id} secretly hides a map` },
  skillIds: ['probe'],
  ...(profile ? { profile } : {}),
});

describe('cast contributor', () => {
  it('shares names and profile fields but never personalities', () => {
    const contributor = castContributor(() => [looks]);
    const [cast] = contributor.contribute({
      actor: actor('a'),
      actors: [actor('a'), actor('b', { looks: 'Tall' })],
      state: { read: () => ({}), change: () => Promise.reject(new Error('read only')) } as never,
      transcript: [],
    });
    expect(cast?.text).toBe('- B\n  Looks: Tall');
    expect(cast?.text).not.toContain('map');
  });
});

describe('ctx.context', () => {
  it('gathers every registered contributor for the reading actor', async () => {
    let seen: AssembledContext | undefined;
    const probe: Skill = {
      id: 'probe',
      name: 'Probe',
      backing: 'code',
      takeTurn: (ctx) => {
        seen = ctx.context(1000);
        return Promise.resolve();
      },
    };
    const host = loadModules(new ModuleHost(), [coreModule]);
    host.skills.register(probe);
    host.profileFields.register(looks);
    host.contextContributors.register({
      id: 'weather',
      contribute: () => [{ id: 'weather', title: 'Weather', text: 'Rain.', priority: 1 }],
    });
    host.providers.register(scriptedProvider([]));
    const session = new SessionRuntime({
      host,
      providerId: 'scripted',
      directorId: 'least-recent',
      modelDefaults: () => ({}),
    });
    await session.join(actor('a'));
    await session.join(actor('b', { looks: 'Tall' }));
    await session.runTurn('a');
    expect(seen?.pieces.map((p) => p.id)).toEqual(['cast', 'weather']);
  });
});
