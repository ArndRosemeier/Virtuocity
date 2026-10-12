import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { defineDocType } from './doc-type';
import { EventBus } from './events';
import type { WritePolicy } from './workspace';
import { Workspace, headMoved, stateChanged } from './workspace';

type Counter = { readonly value: number };
const counter = defineDocType<Counter, { readonly add: number }>({
  id: 'counter',
  version: 1,
  description: 'A number',
  op: z.object({ add: z.number() }),
  initial: () => ({ value: 0 }),
  apply: (state, op) => ({ value: state.value + op.add }),
});
const notes = defineDocType<readonly string[], string>({
  id: 'notes',
  version: 1,
  description: 'Lines',
  op: z.string(),
  initial: () => [],
  apply: (state, op) => [...state, op],
});

function setup(policies: WritePolicy[] = []) {
  let n = 0;
  const bus = new EventBus();
  const events: string[] = [];
  bus.on('*', (e) => void events.push(e.type));
  const ws = new Workspace({ bus, policies: () => policies, newId: () => `o${++n}`, now: () => 0 });
  return { ws, events };
}

describe('Workspace', () => {
  it('folds each document from the shared log and announces changes', async () => {
    const { ws, events } = setup();
    await ws.view('a').change('hp', counter, { add: 5 });
    await ws.view('a').change('log', notes, 'hello');
    await ws.view('b').change('hp', counter, { add: -2 });
    expect(ws.read('hp', counter)).toEqual({ value: 3 });
    expect(ws.read('log', notes)).toEqual(['hello']);
    expect(ws.read('missing', counter)).toEqual({ value: 0 });
    expect(ws.documents()).toEqual([
      { docId: 'hp', docType: 'counter' },
      { docId: 'log', docType: 'notes' },
    ]);
    expect(events).toEqual([stateChanged.type, stateChanged.type, stateChanged.type]);
  });

  it('rewinds every document together, and undo/redo walk the log', async () => {
    const { ws, events } = setup();
    const first = await ws.view('a').change('hp', counter, { add: 1 });
    await ws.view('a').change('log', notes, 'took a potion');
    await ws.view('a').change('hp', counter, { add: 10 });
    expect(await ws.undo()).toBe(true);
    expect(ws.read('hp', counter).value).toBe(1);
    expect(await ws.redo()).toBe(true);
    expect(ws.read('hp', counter).value).toBe(11);
    await ws.rewindTo(first.id);
    expect(ws.read('hp', counter).value).toBe(1);
    expect(ws.read('log', notes)).toEqual([]);
    expect(await ws.redo()).toBe(false);
    expect(events.filter((t) => t === headMoved.type)).toHaveLength(3);
  });

  it('shows each actor only what was meant for them', async () => {
    const { ws } = setup();
    await ws.view('gm').change('log', notes, 'the door creaks');
    await ws.view('gm').change('log', notes, 'a trap is hidden here', { audience: ['gm'] });
    await ws.view('rogue').change('log', notes, 'I check for traps', { audience: ['gm'] });
    expect(ws.read('log', notes, 'bard')).toEqual(['the door creaks']);
    expect(ws.read('log', notes, 'rogue')).toEqual(['the door creaks', 'I check for traps']);
    expect(ws.read('log', notes, 'gm')).toHaveLength(3);
    expect(ws.read('log', notes)).toHaveLength(3);
    expect(ws.view('bard').read('log', notes)).toEqual(['the door creaks']);
  });

  it('hides a change from the actors it names, but never from its author', async () => {
    const { ws } = setup();
    await ws.view('gm').change('log', notes, 'the heir is the thief', { hiddenFrom: ['player'] });
    expect(ws.read('log', notes, 'player')).toEqual([]);
    expect(ws.read('log', notes, 'bard')).toEqual(['the heir is the thief']);
    expect(ws.read('log', notes, 'gm')).toEqual(['the heir is the thief']);
    expect(ws.read('log', notes)).toEqual(['the heir is the thief']);
  });

  it('validates operations and keeps one type per document', async () => {
    const { ws } = setup();
    await expect(ws.view('a').change('hp', counter, { add: 'x' } as never)).rejects.toThrow(
      /Invalid counter/,
    );
    await ws.view('a').change('hp', counter, { add: 1 });
    await expect(ws.view('a').change('hp', notes, 'oops')).rejects.toThrow(/is a "counter"/);
  });

  it('lets write policies refuse changes', async () => {
    const readOnlyReviewer: WritePolicy = {
      id: 'reviewer-comments-only',
      check: (c) =>
        c.actorId === 'reviewer' && c.docType.id === 'notes' ? 'reviewers only comment' : undefined,
    };
    const { ws } = setup([readOnlyReviewer]);
    await expect(ws.view('reviewer').change('log', notes, 'rewrite')).rejects.toThrow(
      /reviewers only comment/,
    );
    await ws.view('author').change('log', notes, 'draft');
    expect(ws.read('log', notes)).toEqual(['draft']);
  });

  it('reuses cached states without going stale after a rewind', async () => {
    const { ws } = setup();
    const first = await ws.view('a').change('hp', counter, { add: 1 });
    await ws.view('a').change('hp', counter, { add: 1 });
    expect(ws.read('hp', counter).value).toBe(2);
    await ws.rewindTo(first.id);
    await ws.view('a').change('hp', counter, { add: 5 });
    expect(ws.read('hp', counter).value).toBe(6);
  });
});
