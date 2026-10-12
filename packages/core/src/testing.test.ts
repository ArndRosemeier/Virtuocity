import { describe, expect, it } from 'vitest';
import { seededRandom } from './random';
import type { Recording } from './testing';
import { recordingProvider, replayProvider, scriptedProvider } from './testing';

const request = {
  modality: 'text',
  model: 'm',
  messages: [{ role: 'user' as const, content: 'hi' }],
};

describe('test providers', () => {
  it('records real answers and replays them without the model', async () => {
    const recording: Recording = { calls: {} };
    const live = recordingProvider(scriptedProvider(['hello']), recording);
    expect((await live.complete(request)).text).toBe('hello');
    const replay = replayProvider(recording);
    expect((await replay.complete(request)).text).toBe('hello');
    await expect(replay.complete({ ...request, model: 'other' })).rejects.toThrow(
      /No recorded response/,
    );
  });

  it('scripts replies in order and fails when they run out', async () => {
    const provider = scriptedProvider(['a']);
    expect((await provider.complete(request)).text).toBe('a');
    await expect(provider.complete(request)).rejects.toThrow(/ran out/);
  });
});

describe('seededRandom', () => {
  it('repeats the same sequence for the same seed, within [0, 1)', () => {
    const a = seededRandom(42);
    const b = seededRandom(42);
    const values = Array.from({ length: 5 }, () => a());
    expect(values).toEqual(Array.from({ length: 5 }, () => b()));
    expect(values.every((v) => v >= 0 && v < 1)).toBe(true);
    expect(seededRandom(7)()).not.toBe(values[0]);
  });
});
