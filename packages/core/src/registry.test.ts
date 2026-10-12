import { describe, expect, it } from 'vitest';
import { Registry } from './registry';

describe('Registry', () => {
  it('registers, gets and lists items', () => {
    const r = new Registry<{ id: string; v: number }>('thing');
    r.register({ id: 'a', v: 1 });
    expect(r.get('a').v).toBe(1);
    expect(r.list()).toHaveLength(1);
  });

  it('rejects duplicate ids but allows explicit replacement', () => {
    const r = new Registry<{ id: string; v: number }>('thing');
    r.register({ id: 'a', v: 1 });
    expect(() => r.register({ id: 'a', v: 2 })).toThrow(/already registered/);
    r.replace({ id: 'a', v: 2 });
    expect(r.get('a').v).toBe(2);
  });

  it('throws on unknown ids', () => {
    expect(() => new Registry('thing').get('nope')).toThrow(/Unknown thing/);
  });
});
