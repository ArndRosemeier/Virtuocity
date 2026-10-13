import { describe, expect, it } from 'vitest';
import type { Actor } from '@virtuocity/core';
import {
  ModuleHost,
  SessionRuntime,
  coreModule,
  loadModules,
  memoryStore,
  startSession,
} from '@virtuocity/core';
import { SessionCatalog } from './sessions';
import type { SwitcherDeps } from './switcher';
import { OPEN_SESSION, SessionSwitcher, UntypedSessionError, typeDeps } from './switcher';
import { writeSetting } from './settings';
import { testType, testTypeSkill } from './testTypes';

const host = loadModules(new ModuleHost(), [coreModule]);
host.skills.register(testTypeSkill());
const runtime = () =>
  new SessionRuntime({
    host,
    modelDefaults: () => ({}),
  });
const bard = {
  id: 'bard',
  controller: 'ai' as const,
  personality: { name: 'Lyra', description: '' },
  skillIds: [],
};

/** Starts a session of the test type with these actors. */
const typed =
  (...actors: Actor[]) =>
  (r: SessionRuntime) =>
    startSession(r, [testType, ...actors]);

function deps(shown: SessionRuntime, catalog: SessionCatalog, types: Actor[] = [testType]) {
  const all: SwitcherDeps = {
    runtime: shown,
    catalog,
    prepare: async () => {},
    scratch: runtime,
    ...typeDeps(
      () => host.skills.list(),
      () => Promise.resolve(types),
    ),
  };
  return all;
}

function setup(types?: Actor[]) {
  writeSetting(OPEN_SESSION, '');
  let n = 0;
  const shown = runtime();
  const catalog = new SessionCatalog(memoryStore<unknown>(), () => `s${++n}`);
  const switcher = new SessionSwitcher(deps(shown, catalog, types));
  return { shown, switcher };
}

const ids = (r: SessionRuntime) => r.actors.map((a) => a.id);

const names = async (switcher: SessionSwitcher) =>
  (await switcher.catalog.list()).map((e) => `${e.name}${e.template ? ' (template)' : ''}`);

describe('session switcher', () => {
  it('starts a first session of the first session type on a fresh start', async () => {
    const { shown, switcher } = setup();
    await switcher.restore();
    expect(await names(switcher)).toEqual(['Session']);
    expect(switcher.openId).toBe('s1');
    expect(ids(shown)).toEqual(['room']);
  });

  it('keeps nothing open while the library has no session type', async () => {
    const { shown, switcher } = setup([]);
    await switcher.restore();
    expect(await names(switcher)).toEqual([]);
    expect(switcher.openId).toBeUndefined();
    expect(shown.actors).toEqual([]);
  });

  it('deletes stored sessions without a session type and refuses files without one', async () => {
    const { shown, switcher } = setup();
    const untyped = runtime();
    await untyped.join(bard);
    const id = await switcher.catalog.create('Old', untyped.save());
    await switcher.restore();
    expect(await names(switcher)).toEqual(['Session']);
    expect(await switcher.catalog.get(id)).toBeUndefined();
    await expect(switcher.startFrom('File', untyped.save())).rejects.toThrow(UntypedSessionError);
    expect(await names(switcher)).toEqual(['Session']);
    expect(ids(shown)).toEqual(['room']);
  });

  it('keeps the open session when a new one starts, and switches back to it', async () => {
    const { shown, switcher } = setup();
    await switcher.startNew('First', typed(bard));
    const first = switcher.openId ?? '';
    await switcher.startNew('Second', typed());
    expect(ids(shown)).toEqual(['room']);
    await switcher.open(first);
    expect(ids(shown)).toEqual(['room', 'bard']);
    expect(await names(switcher)).toEqual(['First', 'Second']);
  });

  it('starts a copy from a template and leaves the template as it was', async () => {
    const { shown, switcher } = setup();
    await switcher.startNew('Quest', typed(bard));
    const template = switcher.openId ?? '';
    await switcher.catalog.setTemplate(template, true);
    await switcher.copy(template, 'Run 1');
    await shown.leave('bard');
    await switcher.flush();
    const stored = await switcher.catalog.get(template);
    const check = runtime();
    await check.load(stored?.state);
    expect(ids(check)).toEqual(['room', 'bard']);
    expect(await names(switcher)).toEqual(['Quest (template)', 'Run 1']);
  });

  it('opens another session when the open one is deleted, never a template', async () => {
    const { switcher } = setup();
    await switcher.startNew('Template', typed());
    await switcher.catalog.setTemplate(switcher.openId ?? '', true);
    await switcher.startNew('Keep', typed());
    const keep = switcher.openId;
    await switcher.startNew('Drop', typed());
    await switcher.removeOpen();
    expect(switcher.openId).toBe(keep);
    await switcher.removeOpen();
    expect(await names(switcher)).toEqual(['Session', 'Template (template)']);
  });

  it('finds every stored session with an actor', async () => {
    const { switcher } = setup();
    await switcher.startNew('With', typed(bard));
    await switcher.startNew('Without', typed());
    const using = await switcher.sessionsWith('bard');
    expect(using.map((e) => e.name)).toEqual(['With']);
  });

  it('reopens the session that was open last', async () => {
    const { switcher } = setup();
    await switcher.startNew('A', typed());
    const a = switcher.openId;
    await switcher.startNew('B', typed());
    await switcher.open(a ?? '');
    const again = new SessionSwitcher(deps(runtime(), switcher.catalog));
    await again.restore();
    expect(again.openId).toBe(a);
  });
});
