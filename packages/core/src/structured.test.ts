import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import type { Complete, CompletionRequest } from './provider';
import { StructuredOutputError, completeStructured, extractJson } from './structured';
import { scriptedProvider } from './testing';

const schema = z.object({ mood: z.enum(['calm', 'tense']), score: z.number() });

function fake(replies: string[]): { complete: Complete; seen: CompletionRequest[] } {
  const provider = scriptedProvider(replies);
  const seen: CompletionRequest[] = [];
  const complete: Complete = (request) => {
    const full = { ...request, model: 'm' };
    seen.push(full);
    return provider.complete(full);
  };
  return { complete, seen };
}

const ask = { modality: 'text', messages: [{ role: 'user' as const, content: 'Rate it' }] };

describe('extractJson', () => {
  it('finds JSON inside fences and text', () => {
    expect(extractJson('Sure!\n```json\n{"a": [1]}\n```')).toEqual({ a: [1] });
    expect(() => extractJson('no json here')).toThrow(/no JSON/);
  });
});

describe('completeStructured', () => {
  it('asks for the schema and parses the answer', async () => {
    const { complete, seen } = fake(['```json\n{"mood": "calm", "score": 3}\n```']);
    const { value, calls } = await completeStructured(complete, ask, schema, { name: 'rating' });
    expect(value).toEqual({ mood: 'calm', score: 3 });
    expect(calls).toHaveLength(1);
    expect(seen[0]?.responseSchema?.name).toBe('rating');
    expect(seen[0]?.responseSchema?.schema).toMatchObject({ type: 'object' });
  });

  it('shows the model its mistake and accepts the repaired answer', async () => {
    const { complete, seen } = fake([
      '{"mood": "angry", "score": 3}',
      '{"mood": "tense", "score": 3}',
    ]);
    const { value, calls } = await completeStructured(complete, ask, schema);
    expect(value.mood).toBe('tense');
    expect(calls).toHaveLength(2);
    const retry = seen[1]?.messages ?? [];
    expect(retry.map((m) => m.role)).toEqual(['user', 'assistant', 'user']);
    expect(retry[2]?.content).toMatch(/mood/);
  });

  it('gives up after the allowed repairs', async () => {
    const { complete } = fake(['nope', 'still nope']);
    const failure = completeStructured(complete, ask, schema, { repairs: 1 });
    await expect(failure).rejects.toBeInstanceOf(StructuredOutputError);
    await expect(failure).rejects.toMatchObject({
      calls: [{ text: 'nope' }, { text: 'still nope' }],
    });
  });
});
