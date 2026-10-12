import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { action, defineContract } from './contract';
import { implement } from './implementation';
import type { Complete, CompletionRequest } from './provider';
import type { Skill } from './skill';
import type { ScriptedReply } from './testing';
import { scriptedProvider } from './testing';
import { actionTool, skillTools } from './skill-tools';
import { completeWithTools, defineTool } from './tools';

const add = defineTool({
  name: 'add',
  description: 'Adds two numbers',
  input: z.object({ a: z.number(), b: z.number() }),
  run: ({ a, b }) => Promise.resolve(a + b),
});

function fake(replies: ScriptedReply[]): { complete: Complete; seen: CompletionRequest[] } {
  const provider = scriptedProvider(replies);
  const seen: CompletionRequest[] = [];
  const complete: Complete = (request) => {
    const full = { ...request, model: 'm' };
    seen.push(full);
    return provider.complete(full);
  };
  return { complete, seen };
}

const ask = { modality: 'text', messages: [{ role: 'user' as const, content: 'What is 2+3?' }] };
const callAdd = (args: string, id = 'c1') => ({
  toolCalls: [{ id, name: 'add', arguments: args }],
});

describe('tools', () => {
  it('describes the input as JSON Schema and validates arguments', async () => {
    expect(add.spec.parameters).toMatchObject({ type: 'object', required: ['a', 'b'] });
    await expect(add.run({ a: 2, b: 3 })).resolves.toBe(5);
    await expect(add.run({ a: 'x' })).rejects.toThrow();
    expect(() =>
      defineTool({
        name: 'no spaces',
        description: '',
        input: z.object({}),
        run: () => Promise.resolve(1),
      }),
    ).toThrow(/Invalid tool name/);
  });

  it('runs requested tools and returns the final answer', async () => {
    const { complete, seen } = fake([callAdd('{"a": 2, "b": 3}'), 'It is 5.']);
    const { result, calls, runs } = await completeWithTools(complete, ask, [add]);
    expect(result.text).toBe('It is 5.');
    expect(calls).toHaveLength(2);
    expect(runs).toEqual([{ tool: 'add', input: { a: 2, b: 3 }, output: 5 }]);
    expect(seen[0]?.tools?.map((t) => t.name)).toEqual(['add']);
    expect(seen[1]?.messages.slice(1)).toEqual([
      { role: 'assistant', content: '', ...callAdd('{"a": 2, "b": 3}') },
      { role: 'tool', toolCallId: 'c1', content: '5' },
    ]);
  });

  it('reports bad calls to the model so it can correct itself', async () => {
    const { complete, seen } = fake([
      callAdd('{"a": 2'),
      { toolCalls: [{ id: 'c2', name: 'multiply', arguments: '{}' }] },
      'Done.',
    ]);
    const { runs } = await completeWithTools(complete, ask, [add]);
    expect(runs.map((r) => r.error !== undefined)).toEqual([true, true]);
    expect(seen[2]?.messages.at(-1)?.content).toMatch(/no tool named "multiply"/);
  });

  it('makes the model answer after the round limit', async () => {
    const { complete, seen } = fake([callAdd('{"a":1,"b":1}'), callAdd('{"a":1,"b":1}', 'c2')]);
    const { result, runs } = await completeWithTools(complete, ask, [add], 1);
    expect(runs).toHaveLength(1);
    expect(seen.map((r) => r.toolChoice)).toEqual(['auto', 'none']);
    expect(result.toolCalls).toHaveLength(1);
  });

  it('skips the loop without tools', async () => {
    const { complete, seen } = fake(['Plain.']);
    expect((await completeWithTools(complete, ask, [])).result.text).toBe('Plain.');
    expect(seen[0]?.tools).toBeUndefined();
  });
});

const echo = defineContract({
  name: 'echo',
  version: '1.0',
  description: 'Echoes',
  actions: {
    say: action({
      description: 'Say it back',
      input: z.object({ text: z.string() }),
      output: z.string(),
    }),
  },
});
const skill = (id: string): Skill => ({
  id,
  name: id,
  backing: 'code',
  implements: [implement(echo, { say: ({ text }) => Promise.resolve(text) })],
});

describe('skillTools', () => {
  it('offers the other skills’ actions but never the calling skill’s own contracts', async () => {
    const talker: Skill = { id: 'talker', name: 'Talker', backing: 'llm' };
    const calls: string[] = [];
    const tools = skillTools([talker, skill('a'), skill('b')], talker, (contract, name, input) => {
      calls.push(`${contract.id} ${name}`);
      return Promise.resolve(input);
    });
    expect(tools.map((t) => t.spec.name)).toEqual(['echo_say']);
    await tools[0]?.run({ text: 'hi' });
    expect(calls).toEqual(['echo@1.0 say']);
    expect(skillTools([skill('a'), skill('b')], skill('a'), () => Promise.resolve(null))).toEqual(
      [],
    );
    expect(actionTool(echo, 'say', () => Promise.resolve(null)).spec.description).toBe(
      'Say it back',
    );
  });
});
