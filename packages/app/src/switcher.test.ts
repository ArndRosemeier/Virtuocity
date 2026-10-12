import { describe, expect, it } from 'vitest';
import { ModuleHost, SessionRuntime, coreModule, loadModules, memoryStore } from '@virtuocity/core';
import { SessionCatalog } from './sessions';
import { OPEN_SESSION, SessionSwitcher } from './switcher';
import { writeSetting } from './settings';

const host = loadModules(new ModuleHost(), [coreModule]);
const runtime = () =>
  new SessionRuntime({
    host,
    directorId: 'least-recent',
    modelDefaults: () => ({}),
  });
const bard = {
  id: 'bard',
  controller: 'ai' as const,
  personality: { name: 'Lyra', description: '' },
  skillIds: [],
};

function setup() {
  writeSetting(OPEN_SESSION, '');
  let n = 0;
  const shown = runtime();
  const switcher = new SessionSwitcher({
    runtime: shown,
    catalog: new SessionCatalog(memoryStore<unknown>(), () => `s${++n}`),
    prepare: async () => {},
    scratch: runtime,
  });
  return { shown, switcher };
}

const names = async (switcher: SessionSwitcher) =>
  (await switcher.catalog.list()).map((e) => `${e.name}${e.template ? ' (template)' : ''}`);

describe('session switcher', () => {
  it('starts a first session on a fresh start', async () => {
    const { switcher } = setup();
    await switcher.restore();
    expect(await names(switcher)).toEqual(['Session']);
    expect(switcher.openId).toBe('s1');
  });

  it('keeps the open session when a new one starts, and switches back to it', async () => {
    const { shown, switcher } = setup();
    await switcher.startNew('First', (r) => r.join(bard));
    const first = switcher.openId ?? '';
    await switcher.startNew('Second');
    expect(shown.actors).toEqual([]);
    await switcher.open(first);
    expect(shown.actors.map((a) => a.id)).toEqual(['bard']);
    expect(await names(switcher)).toEqual(['First', 'Second']);
  });

  it('starts a copy from a template and leaves the template as it was', async () => {
    const { shown, switcher } = setup();
    await switcher.startNew('Quest', (r) => r.join(bard));
    const template = switcher.openId ?? '';
    await switcher.catalog.setTemplate(template, true);
    await switcher.copy(template, 'Run 1');
    await shown.leave('bard');
    await switcher.flush();
    const stored = await switcher.catalog.get(template);
    const check = runtime();
    await check.load(stored?.state);
    expect(check.actors.map((a) => a.id)).toEqual(['bard']);
    expect(await names(switcher)).toEqual(['Quest (template)', 'Run 1']);
  });

  it('opens another session when the open one is deleted, never a template', async () => {
    const { switcher } = setup();
    await switcher.startNew('Template');
    await switcher.catalog.setTemplate(switcher.openId ?? '', true);
    await switcher.startNew('Keep');
    const keep = switcher.openId;
    await switcher.startNew('Drop');
    await switcher.removeOpen();
    expect(switcher.openId).toBe(keep);
    await switcher.removeOpen();
    expect(await names(switcher)).toEqual(['Session', 'Template (template)']);
  });

  it('finds every stored session with an actor', async () => {
    const { switcher } = setup();
    await switcher.startNew('With', (r) => r.join(bard));
    await switcher.startNew('Without');
    const using = await switcher.sessionsWith('bard');
    expect(using.map((e) => e.name)).toEqual(['With']);
  });

  it('reopens the session that was open last', async () => {
    const { switcher } = setup();
    await switcher.startNew('A');
    const a = switcher.openId;
    await switcher.startNew('B');
    await switcher.open(a ?? '');
    const again = new SessionSwitcher({
      runtime: runtime(),
      catalog: switcher.catalog,
      prepare: async () => {},
      scratch: runtime,
    });
    await again.restore();
    expect(again.openId).toBe(a);
  });
});
