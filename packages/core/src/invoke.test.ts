import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import type { Actor } from './actor';
import { defineAdapter } from './adapter';
import { check, conformanceSuite, conformanceTarget } from './conformance';
import { action, defineContract, optionalAction } from './contract';
import { coreModule } from './core-module';
import { humanTaskCreated } from './human-tasks';
import { ContractError, implement } from './implementation';
import { ModuleHost, loadModules } from './module';
import { SessionRuntime } from './runtime';
import type { Skill } from './skill';
import { implementersOf } from './skill';
import { parseRef } from './contract-version';

const critic = defineContract({
  name: 'critic',
  version: '1.0',
  description: 'Comments on text',
  actions: {
    critique: action({
      description: 'Notes on a text',
      input: z.object({ text: z.string().min(1) }),
      output: z.object({ notes: z.array(z.string()) }),
    }),
  },
  conformance: [
    {
      name: 'returns at least one note',
      run: async (t) => {
        const { notes } = await t.invoke('critique', { text: 'Hello.' });
        check(notes.length > 0, 'expected a note');
      },
    },
  ],
});

const reviewer = defineContract({
  name: 'reviewer',
  version: '1.0',
  description: 'Critic that also decides',
  extends: [critic],
  actions: {
    verdict: action({
      description: 'Approve or not',
      input: z.object({ text: z.string() }),
      output: z.boolean(),
    }),
    explain: optionalAction({ description: 'Why', input: z.object({}), output: z.string() }),
  },
  conformance: [
    {
      name: 'approves short texts',
      run: async (t) => check(await t.invoke('verdict', { text: 'ok' }), 'no'),
    },
  ],
});

const strictReviewer: Skill = {
  id: 'strict',
  name: 'Strict reviewer',
  backing: 'code',
  implements: [
    implement(reviewer, {
      critique: ({ text }) => Promise.resolve({ notes: [`${text.length} characters`] }),
      verdict: ({ text }) => Promise.resolve(text.length < 10),
    }),
  ],
};

const actor = (id: string, controller: Actor['controller'], skillIds: string[]): Actor => ({
  id,
  controller,
  personality: { name: id, description: '' },
  skillIds,
});

async function session(skills: Skill[], ...actors: Actor[]) {
  const host = loadModules(new ModuleHost(), [coreModule]);
  skills.forEach((s) => host.skills.register(s));
  const runtime = new SessionRuntime({
    host,
    directorId: 'least-recent',
    modelDefaults: () => ({}),
  });
  for (const a of actors) await runtime.join(a);
  return { host, runtime };
}

describe('implement', () => {
  it('refuses missing required actions and unknown ones', () => {
    const critique = () => Promise.resolve({ notes: [] });
    // @ts-expect-error verdict is required
    expect(() => implement(reviewer, { critique })).toThrow(/missing action "verdict"/);
    // @ts-expect-error nope is not an action of the contract
    expect(() => implement(critic, { critique, nope: critique })).toThrow(/no action "nope"/);
  });
});

describe('SessionRuntime.invoke', () => {
  it('serves a request for the parent through a child implementation', async () => {
    const { runtime } = await session([strictReviewer], actor('ed', 'ai', ['strict']));
    expect(await runtime.invoke('ed', critic, 'critique', { text: 'abc' })).toEqual({
      notes: ['3 characters'],
    });
    expect(implementersOf([strictReviewer], parseRef('critic@1'))).toEqual([strictReviewer]);
  });

  it('reports invalid input, invalid output, missing actions and missing skills with codes', async () => {
    const liar: Skill = {
      id: 'liar',
      name: 'Liar',
      backing: 'code',
      implements: [
        implement(critic, { critique: () => Promise.resolve({ notes: 'nope' } as never) }),
      ],
    };
    const { runtime } = await session(
      [strictReviewer, liar],
      actor('ed', 'ai', ['strict']),
      actor('li', 'ai', ['liar']),
    );
    const code = (p: Promise<unknown>) =>
      p.then(
        () => 'ok',
        (e: unknown) => (e as ContractError).code,
      );
    expect(await code(runtime.invoke('ed', critic, 'critique', { text: '' }))).toBe(
      'invalid-input',
    );
    expect(await code(runtime.invoke('li', critic, 'critique', { text: 'x' }))).toBe(
      'invalid-output',
    );
    expect(await code(runtime.invoke('ed', reviewer, 'explain', {}))).toBe('not-implemented');
    expect(await code(runtime.invoke('li', reviewer, 'verdict', { text: 'x' }))).toBe(
      'no-implementation',
    );
  });

  it('turns thrown handler errors into failed contract errors', async () => {
    const broken: Skill = {
      id: 'broken',
      name: 'Broken',
      backing: 'code',
      implements: [implement(critic, { critique: () => Promise.reject(new Error('boom')) })],
    };
    const { runtime } = await session([broken], actor('b', 'ai', ['broken']));
    const error = await runtime
      .invoke('b', critic, 'critique', { text: 'x' })
      .catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ContractError);
    expect((error as ContractError).code).toBe('failed');
  });

  it('bridges versions through a registered adapter', async () => {
    const criticV2 = defineContract({
      name: 'critic',
      version: '2.0',
      description: 'Notes with severity',
      actions: {
        critique: action({
          description: 'Notes',
          input: z.object({ text: z.string() }),
          output: z.array(z.object({ note: z.string(), severity: z.number() })),
        }),
      },
    });
    const modern: Skill = {
      id: 'modern',
      name: 'Modern',
      backing: 'code',
      implements: [
        implement(criticV2, {
          critique: () => Promise.resolve([{ note: 'tighten', severity: 2 }]),
        }),
      ],
    };
    const { host, runtime } = await session([modern], actor('m', 'ai', ['modern']));
    host.adapters.register(
      defineAdapter({
        id: 'critic-2-to-1',
        from: criticV2,
        to: critic,
        handlers: (source) => ({
          critique: async (input, ctx) => ({
            notes: (await source.invoke('critique', input, ctx)).map((n) => n.note),
          }),
        }),
      }),
    );
    expect(await runtime.invoke('m', critic, 'critique', { text: 'x' })).toEqual({
      notes: ['tighten'],
    });
  });
});

describe('human tasks', () => {
  it('turns an action for a human into a task with JSON schemas and resolves on a valid answer', async () => {
    const { runtime } = await session([], actor('arnd', 'human', []));
    const created: string[] = [];
    runtime.bus.on(humanTaskCreated, (e) => void created.push(e.payload.taskId));
    const answer = runtime.invoke('arnd', reviewer, 'verdict', { text: 'chapter one' });
    await Promise.resolve();
    const [task] = runtime.tasks.pending();
    expect(task?.description).toBe('Approve or not');
    expect(task?.outputSchema).toMatchObject({ type: 'boolean' });
    expect(created).toEqual([task?.id]);
    await expect(runtime.tasks.submit(task?.id ?? '', 'yes')).rejects.toThrow(ContractError);
    expect(runtime.tasks.pending()).toHaveLength(1);
    await runtime.tasks.submit(task?.id ?? '', true);
    expect(await answer).toBe(true);
    expect(runtime.tasks.pending()).toEqual([]);
  });

  it('rejects the caller when a task is cancelled', async () => {
    const { runtime } = await session([], actor('arnd', 'human', []));
    const answer = runtime.invoke('arnd', critic, 'critique', { text: 'x' });
    await Promise.resolve();
    await runtime.tasks.cancel(runtime.tasks.pending()[0]?.id ?? '');
    await expect(answer).rejects.toMatchObject({ code: 'cancelled' });
  });
});

describe('conformance', () => {
  it('collects ancestor cases so a child is checked as a stand-in for its parent', () => {
    expect(conformanceSuite(reviewer).map((c) => `${c.contractId}: ${c.name}`)).toEqual([
      'reviewer@1.0: approves short texts',
      'critic@1.0: returns at least one note',
    ]);
  });

  it('runs every case against a skill and reports optional actions', async () => {
    const target = conformanceTarget(reviewer, { skills: [strictReviewer] });
    for (const testCase of conformanceSuite(reviewer)) await testCase.run(target);
    expect(target.implements('verdict')).toBe(true);
    expect(target.implements('explain')).toBe(false);
  });
});
