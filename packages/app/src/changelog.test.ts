import { describe, expect, it } from 'vitest';
import { RELEASES, currentRelease, formatVersion, unseen } from './changelog';

describe('changelog', () => {
  it('counts builds up by one from 1, newest first', () => {
    const builds = RELEASES.map((r) => r.build);
    expect(builds).toEqual(builds.map((_, i) => builds.length - i));
  });

  it('has a valid date and at least one change per build', () => {
    for (const release of RELEASES) {
      expect(release.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(release.changes.length).toBeGreaterThan(0);
    }
  });

  it('formats the build as a version with three decimals', () => {
    expect(formatVersion(1)).toBe('0.001');
    expect(formatVersion(42)).toBe('0.042');
    expect(formatVersion(1234)).toBe('1.234');
  });

  it('finds the newest release and the ones not yet seen', () => {
    const releases = [
      { build: 3, date: '2026-01-03', changes: ['c'] },
      { build: 2, date: '2026-01-02', changes: ['b'] },
      { build: 1, date: '2026-01-01', changes: ['a'] },
    ];
    expect(currentRelease(releases).build).toBe(3);
    expect(unseen(1, releases).map((r) => r.build)).toEqual([3, 2]);
  });
});
