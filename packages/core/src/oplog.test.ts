import { describe, expect, it } from 'vitest';
import { OpLog } from './oplog';

function log() {
  let n = 0;
  return new OpLog(
    () => `o${++n}`,
    () => 0,
  );
}
const op = (payload: string) => ({
  docId: 'd',
  docType: 't',
  docVersion: 1,
  actorId: 'a',
  payload,
});
const payloads = (l: OpLog) => l.path().map((o) => o.payload);

describe('OpLog', () => {
  it('appends along the head path', () => {
    const l = log();
    l.append(op('one'));
    l.append(op('two'));
    expect(payloads(l)).toEqual(['one', 'two']);
    expect(l.path()[1]?.parentId).toBe('o1');
  });

  it('removes everything below on rewind by default', () => {
    const l = log();
    const first = l.append(op('one'));
    l.append(op('two'));
    l.rewindTo(first.id);
    l.append(op('two again'));
    expect(payloads(l)).toEqual(['one', 'two again']);
    expect(l.children(first.id)).toHaveLength(1);
  });

  it('keeps the old path as a branch when asked and can switch back', () => {
    const l = log();
    const first = l.append(op('one'));
    const old = l.append(op('two'));
    l.rewindTo(first.id, { keepBranch: true });
    l.append(op('alt'));
    expect(l.leaves().map((o) => o.payload)).toEqual(['two', 'alt']);
    l.switchTo(old.id);
    expect(payloads(l)).toEqual(['one', 'two']);
  });

  it('rewinds to empty with null', () => {
    const l = log();
    l.append(op('one'));
    l.rewindTo(null);
    expect(l.path()).toEqual([]);
    expect(l.all()).toEqual([]);
  });
});
