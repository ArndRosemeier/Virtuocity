import type { Actor, StateView } from '@virtuocity/core';
import { describe, expect, it } from 'vitest';
import type { MemoryState } from './memory';
import { latestChronicle, memoryContributor, memoryDoc } from './memory';

const meta = (at: number) => ({ opId: `op${at}`, actorId: 'someone', at });

function fold(...ops: Parameters<typeof memoryDoc.apply>[1][]): MemoryState {
  return ops.reduce((state, op, i) => memoryDoc.apply(state, op, meta(i + 1)), memoryDoc.initial());
}

const view = (state: MemoryState): StateView => ({
  read: <S>() => state as S,
  change: () => Promise.reject(new Error('read only')),
});

describe('memory', () => {
  it('keeps one summary per chronicler and can forget one', () => {
    const state = fold(
      { type: 'set', chroniclerId: 'a', summary: 'One', upTo: 'm1' },
      { type: 'set', chroniclerId: 'b', summary: 'Two', upTo: 'm2' },
      { type: 'set', chroniclerId: 'a', summary: 'Three', upTo: 'm3' },
      { type: 'forget', chroniclerId: 'b' },
    );
    expect(state.chronicles).toEqual({ a: { summary: 'Three', upTo: 'm3', at: 3 } });
  });

  it('offers the most recent summary to every actor', () => {
    const state = fold(
      { type: 'set', chroniclerId: 'a', summary: 'Older', upTo: 'm1' },
      { type: 'set', chroniclerId: 'b', summary: 'Newer', upTo: 'm2' },
    );
    expect(latestChronicle(view(state))?.summary).toBe('Newer');
    const actor: Actor = {
      id: 'x',
      controller: 'ai',
      personality: { name: 'X', description: '' },
      skillIds: [],
    };
    const request = { actor, actors: [actor], cast: [], state: view(state), transcript: [] };
    expect(memoryContributor.contribute(request)).toEqual([
      { id: 'story-so-far', title: 'The story so far', text: 'Newer', priority: 60 },
    ]);
    expect(memoryContributor.contribute({ ...request, state: view(fold()) })).toEqual([]);
  });
});
