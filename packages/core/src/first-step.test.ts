import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { coreModule } from './core-module';
import type { Flow } from './flow';
import { defineFlow } from './flow';
import { ModuleHost, loadModules } from './module';
import { textContent } from './output';
import { SessionRuntime } from './runtime';
import { firstStep } from './session-events';
import { startSession } from './setup';
import type { Skill } from './skill';

const talk: Skill = {
  id: 'talk',
  name: 'Talk',
  backing: 'code',
  takeTurn: async (ctx) => void (await ctx.post(textContent('Hello.'))),
};

/** Posts an opening at the first step, as a premise does. */
const opener: Skill = {
  id: 'opener',
  name: 'Opener',
  backing: 'code',
  listensTo: [firstStep.type],
  onEvent: async (_event, ctx) => void (await ctx.post(textContent('Once upon a time.'))),
};

const idle = defineFlow({
  id: 'idle',
  name: 'Idle',
  description: 'Does nothing.',
  input: z.object({}),
  run: () => Promise.resolve(),
});

function session() {
  const host = loadModules(new ModuleHost(), [coreModule]);
  host.skills.register(talk);
  host.skills.register(opener);
  host.flows.register(idle as Flow);
  const runtime = new SessionRuntime({ host, modelDefaults: () => ({}) });
  const steps: unknown[] = [];
  runtime.bus.on(firstStep, (e) => void steps.push(e.payload));
  return { runtime, steps };
}

const actor = (id: string, skillIds: string[]) => ({
  id,
  controller: 'ai' as const,
  personality: { name: id, description: '' },
  skillIds,
});

const texts = (runtime: SessionRuntime) => runtime.transcript().map((m) => m.text);

describe('the first step', () => {
  it('does not happen when a session starts', async () => {
    const { runtime, steps } = session();
    await startSession(runtime, [actor('opener', ['opener'])]);
    expect(steps).toHaveLength(0);
    expect(runtime.transcript()).toHaveLength(0);
  });

  it('comes right before the first post, once', async () => {
    const { runtime, steps } = session();
    await startSession(runtime, [actor('opener', ['opener'])]);
    await runtime.post('user', textContent('I look around.'));
    await runtime.post('user', textContent('And again.'));
    expect(steps).toHaveLength(1);
    expect(texts(runtime)).toEqual(['Once upon a time.', 'I look around.', 'And again.']);
  });

  it('comes right before the first turn and the first flow run', async () => {
    const turn = session();
    await startSession(turn.runtime, [actor('opener', ['opener']), actor('wren', ['talk'])]);
    await turn.runtime.runTurn('wren');
    expect(texts(turn.runtime)).toEqual(['Once upon a time.', 'Hello.']);
    const flow = session();
    await startSession(flow.runtime, [actor('opener', ['opener'])]);
    await flow.runtime.flows.run('idle', {});
    expect(texts(flow.runtime)).toEqual(['Once upon a time.']);
  });

  it('comes again when the session is rewound to empty', async () => {
    const { runtime, steps } = session();
    await startSession(runtime, [actor('opener', ['opener'])]);
    await runtime.post('user', textContent('I look around.'));
    const [opening] = runtime.transcript();
    if (!opening) throw new Error('expected an opening');
    await runtime.rewindToMessage(opening.id, { before: true });
    await runtime.post('user', textContent('I run.'));
    expect(steps).toHaveLength(2);
    expect(texts(runtime)).toEqual(['Once upon a time.', 'I run.']);
  });
});
