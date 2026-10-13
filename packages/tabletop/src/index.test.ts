import { describe, expect, it } from 'vitest';
import { ModuleHost, coreModule, loadModules } from '@virtuocity/core';
import { dnd5eType, pf2eType, tabletopModule, tabletopStarters } from './index';

describe('the tabletop module', () => {
  it('offers a session type per game system and its game master and a player', () => {
    const host = loadModules(new ModuleHost(), [coreModule, tabletopModule]);
    const ids = host.starters.list().map((s) => s.id);
    expect(ids).toEqual([pf2eType.id, dnd5eType.id, ...tabletopStarters.map((s) => s.id)]);
  });

  it('casts only a game master and players of its own system', () => {
    const roles = (pf2eType.settings?.['session-type'] as { roles: { needs?: string[] }[] }).roles;
    const needs = roles.flatMap((r) => r.needs ?? []);
    expect(needs).toContain('pf2e-gm@1.0');
    expect(needs).toContain('pf2e-player@1.0');
    expect(needs.some((n) => n.startsWith('dnd5e'))).toBe(false);
  });
});
