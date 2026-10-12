import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { action, ancestry, defineContract, fulfils, optionalAction } from './contract';
import { ContractRegistry } from './contract-registry';
import { formatRef, parseRef, satisfies } from './contract-version';

const read = action({ description: 'Read', input: z.object({}), output: z.string() });
const canvas = defineContract({
  name: 'canvas',
  version: '1.0',
  description: 'Shared surface',
  actions: { read },
  emits: ['canvas.changed'],
});
const textCanvas = defineContract({
  name: 'text-canvas',
  version: '1.2',
  description: 'Text surface',
  extends: [canvas],
  actions: {
    insert: action({
      description: 'Insert',
      input: z.object({ text: z.string() }),
      output: z.object({}),
    }),
  },
});
const scene = defineContract({
  name: 'scene',
  version: '1.0',
  description: 'Scene',
  extends: [canvas],
  actions: {
    look: optionalAction({ description: 'Look', input: z.object({}), output: z.string() }),
  },
});

describe('contract versions', () => {
  it('parses references with and without a minor', () => {
    expect(parseRef('visualizer@1')).toEqual({
      name: 'visualizer',
      version: { major: 1, minor: 0 },
    });
    expect(formatRef(parseRef('text-canvas@2.3'))).toBe('text-canvas@2.3');
    expect(() => parseRef('Bad Name@1')).toThrow();
    expect(() => parseRef('canvas@x')).toThrow();
  });

  it('accepts newer minors but never another major', () => {
    expect(satisfies(parseRef('a@1.3'), parseRef('a@1.1'))).toBe(true);
    expect(satisfies(parseRef('a@1.0'), parseRef('a@1.1'))).toBe(false);
    expect(satisfies(parseRef('a@2.0'), parseRef('a@1'))).toBe(false);
  });
});

describe('defineContract', () => {
  it('inherits actions, events and the parent chain', () => {
    expect(textCanvas.id).toBe('text-canvas@1.2');
    expect(Object.keys(textCanvas.actions)).toEqual(['read', 'insert']);
    expect(textCanvas.emits).toEqual(['canvas.changed']);
    expect(ancestry(textCanvas).map((c) => c.id)).toEqual(['text-canvas@1.2', 'canvas@1.0']);
  });

  it('lets a child stand in for any ancestor, but not the other way round', () => {
    expect(fulfils(textCanvas, parseRef('canvas@1'))).toBe(true);
    expect(fulfils(textCanvas, parseRef('text-canvas@1.1'))).toBe(true);
    expect(fulfils(canvas, parseRef('text-canvas@1'))).toBe(false);
    expect(fulfils(textCanvas, parseRef('scene@1'))).toBe(false);
  });

  it('allows diamonds where both parents share an ancestor', () => {
    const both = defineContract({
      name: 'scene-text',
      version: '1.0',
      description: 'Both',
      extends: [textCanvas, scene],
      actions: {},
    });
    expect(Object.keys(both.actions).sort()).toEqual(['insert', 'look', 'read']);
    expect(ancestry(both)).toHaveLength(4);
  });

  it('rejects conflicting parents and redefined actions', () => {
    const other = defineContract({
      name: 'other',
      version: '1.0',
      description: '',
      actions: { read: { ...read } },
    });
    expect(() =>
      defineContract({
        name: 'x',
        version: '1.0',
        description: '',
        extends: [canvas, other],
        actions: {},
      }),
    ).toThrow(/conflicting definitions of action "read"/);
    expect(() =>
      defineContract({
        name: 'y',
        version: '1.0',
        description: '',
        extends: [canvas],
        actions: { read },
      }),
    ).toThrow(/cannot redefine inherited action "read"/);
  });

  it('requires schemas that can become JSON Schema', () => {
    const odd = action({ description: '', input: z.date(), output: z.string() });
    expect(() =>
      defineContract({ name: 'odd', version: '1.0', description: '', actions: { odd } }),
    ).toThrow(/not representable as JSON/);
  });
});

describe('ContractRegistry', () => {
  it('registers ancestors and tolerates the same contract twice', () => {
    const registry = new ContractRegistry();
    registry.register(textCanvas);
    registry.register(canvas);
    expect(registry.list().map((c) => c.id)).toEqual(['text-canvas@1.2', 'canvas@1.0']);
    expect(registry.descendantsOf('canvas@1').map((c) => c.id)).toEqual([
      'text-canvas@1.2',
      'canvas@1.0',
    ]);
  });

  it('rejects a second definition with the same id', () => {
    const registry = new ContractRegistry();
    registry.register(canvas);
    const copy = defineContract({ name: 'canvas', version: '1.0', description: '', actions: {} });
    expect(() => registry.register(copy)).toThrow(/defined twice/);
  });

  it('finds the newest compatible minor and refuses minors that drop actions', () => {
    const registry = new ContractRegistry();
    const v11 = defineContract({
      name: 'canvas',
      version: '1.1',
      description: '',
      actions: { read, undo: read },
    });
    registry.register(canvas);
    registry.register(v11);
    expect(registry.find('canvas@1')?.id).toBe('canvas@1.1');
    expect(registry.find('canvas@2')).toBeUndefined();
    const v12 = defineContract({
      name: 'canvas',
      version: '1.2',
      description: '',
      actions: { read },
    });
    expect(() => registry.register(v12)).toThrow(/drops actions/);
  });
});
