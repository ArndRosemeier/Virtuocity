import { describe, expect, it } from 'vitest';
import { CAST, hasActed } from './cast';
import type { Operation } from './oplog';

const op = (id: string, actorId: string, docId: string, parentId: string | null): Operation => ({
  id,
  parentId,
  at: 0,
  actorId,
  docId,
  docType: docId,
  docVersion: 1,
  payload: {},
});

describe('hasActed', () => {
  it('ignores joining and leaving', () => {
    const ops = [op('1', 'a', CAST, null), op('2', 'a', CAST, '1')];
    expect(hasActed(ops, 'a')).toBe(false);
  });

  it('counts anything else, on any branch', () => {
    const ops = [op('1', 'a', CAST, null), op('2', 'b', 'main', '1'), op('3', 'a', 'main', '1')];
    expect(hasActed(ops, 'a')).toBe(true);
    expect(hasActed(ops, 'c')).toBe(false);
  });
});
