import { describe, expect, it } from 'vitest';
import type { Actor } from './actor';
import { coreModule } from './core-module';
import { ModuleHost, loadModules } from './module';
import { textContent } from './output';
import { SessionRuntime } from './runtime';
import { everyone } from './cast-refs';
import { clearSession } from './clear-session';
import { SETUP, hideGuide, setupDoc } from './setup';

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

describe('leaving', () => {
  it('keeps what the actor did and its name, and stops it taking part', async () => {
    const runtime = await session();
    await runtime.post('premise', textContent('You wake on a train.'));
    await runtime.post('narrator', textContent('The train slows.'));
    await runtime.leave('premise');
    expect(texts(runtime)).toEqual(['You wake on a train.', 'The train slows.']);
    expect(ids(runtime)).toEqual(['narrator']);
    expect(everyone(runtime).map((a) => a.id)).toEqual(['narrator', 'premise']);
  });

  it('stops the running jobs of the actor that leaves', async () => {
    const runtime = await session();
    const job = runtime.jobs.start({ actorId: 'premise', label: 'Painting' }, (control) => {
      return new Promise((_, reject) => control.signal.addEventListener('abort', reject));
    });
    await runtime.leave('premise');
    expect((await job.done).status).toBe('cancelled');
  });

  it('comes back when the session goes back to before it left', async () => {
    const runtime = await session();
    const opening = await runtime.post('premise', textContent('You wake on a train.'));
    await runtime.leave('premise');
    await runtime.rewindToMessage(opening.id);
    expect(ids(runtime)).toEqual(['premise', 'narrator']);
  });
});

describe('clearing a session', () => {
  it('keeps the cast and setup, and drops everything that happened on every branch', async () => {
    const runtime = await session();
    const opening = await runtime.post('premise', textContent('You wake on a train.'));
    await runtime.post('narrator', textContent('The train slows.'));
    await runtime.rewindToMessage(opening.id, { keepBranch: true });
    await runtime.join(actor('ink'));
    await runtime.leave('premise');
    await hideGuide(runtime);
    await clearSession(runtime);
    expect(texts(runtime)).toEqual([]);
    expect(ids(runtime)).toEqual(['narrator', 'ink']);
    expect(runtime.workspace.read(SETUP, setupDoc)).toEqual({ guideHidden: true });
    expect(runtime.workspace.log.leaves()).toHaveLength(1);
    await runtime.post('narrator', textContent('Again.'));
    expect(texts(runtime)).toEqual(['Again.']);
  });
});
