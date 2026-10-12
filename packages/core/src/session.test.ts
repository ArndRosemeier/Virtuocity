import { describe, expect, it } from 'vitest';
import { MessageTree } from './session';

function tree() {
  let n = 0;
  return new MessageTree(() => `m${++n}`);
}
const say = (text: string, actorId = 'a') => ({ actorId, parts: [{ kind: 'text', data: text }] });
const texts = (t: MessageTree) => t.activePath().map((m) => m.parts[0]?.data);

describe('MessageTree', () => {
  it('appends along the active path', () => {
    const t = tree();
    t.append(say('one'));
    t.append(say('two'));
    expect(texts(t)).toEqual(['one', 'two']);
  });

  it('edits any message in place', () => {
    const t = tree();
    const first = t.append(say('one'));
    t.append(say('two'));
    t.edit(first.id, [{ kind: 'text', data: 'uno' }]);
    expect(texts(t)).toEqual(['uno', 'two']);
  });

  it('removes everything below on rewind by default', () => {
    const t = tree();
    const first = t.append(say('one'));
    t.append(say('two'));
    t.rewindTo(first.id);
    t.append(say('two again'));
    expect(texts(t)).toEqual(['one', 'two again']);
    expect(t.children(first.id)).toHaveLength(1);
  });

  it('keeps the old path as a branch when asked', () => {
    const t = tree();
    const first = t.append(say('one'));
    const old = t.append(say('two'));
    t.rewindTo(first.id, { keepBranch: true });
    t.append(say('alt'));
    expect(t.children(first.id)).toHaveLength(2);
    t.switchTo(old.id);
    expect(texts(t)).toEqual(['one', 'two']);
  });

  it('collects stats from all messages', () => {
    const t = tree();
    t.append({ ...say('x'), stats: [{ model: 'm', promptTokens: 1, completionTokens: 2 }] });
    expect(t.allStats()).toHaveLength(1);
  });
});
