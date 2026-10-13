import { describe, expect, it } from 'vitest';
import type { Actor } from './actor';
import { coreModule } from './core-module';
import { ModuleHost, loadModules } from './module';
import { textContent } from './output';
import { SessionRuntime } from './runtime';
import { hideGuide } from './setup';
import { withdraw } from './withdraw';

const actor = (id: string): Actor => ({
  id,
  controller: 'ai',
  personality: { name: id, description: '' },
  skillIds: [],
});

async function session() {
  const runtime = new SessionRuntime({
    host: loadModules(new ModuleHost(), [coreModule]),
    modelDefaults: () => ({}),
  });
  await runtime.join(actor('premise'));
  await runtime.join(actor('narrator'));
  return runtime;
}

const texts = (runtime: SessionRuntime) => runtime.transcript().map((m) => m.text);
const ids = (runtime: SessionRuntime) => runtime.actors.map((a) => a.id);

describe('withdraw', () => {
  it('takes out an actor that did nothing', async () => {
    const runtime = await session();
    expect(await withdraw(runtime, 'premise')).toBe(true);
    expect(ids(runtime)).toEqual(['narrator']);
  });

  it('takes out what an actor did when nobody went on from it', async () => {
    const runtime = await session();
    await runtime.post('premise', textContent('You wake on a train.'), undefined, {
      hiddenFrom: ['user'],
    });
    await runtime.join(actor('ink'));
    await hideGuide(runtime);
    expect(await withdraw(runtime, 'premise')).toBe(true);
    expect(texts(runtime)).toEqual([]);
    expect(ids(runtime)).toEqual(['narrator', 'ink']);
    expect(runtime.workspace.log.all().some((op) => op.actorId === 'premise')).toBe(true);
  });

  it('keeps an actor the session went on from, on any branch', async () => {
    const runtime = await session();
    const opening = await runtime.post('premise', textContent('You wake on a train.'));
    await runtime.post('narrator', textContent('The train slows.'));
    await runtime.rewindToMessage(opening.id, { keepBranch: true });
    expect(await withdraw(runtime, 'premise')).toBe(false);
    expect(texts(runtime)).toEqual(['You wake on a train.']);
    expect(ids(runtime)).toEqual(['premise', 'narrator']);
  });
});
