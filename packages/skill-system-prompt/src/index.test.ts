import type { Actor, ModelProvider, Skill } from '@virtuocity/core';
import { ModuleHost, SessionRuntime, coreModule, loadModules, textContent } from '@virtuocity/core';
import { describe, expect, it, vi } from 'vitest';
import { systemPromptModule } from './index';

const talker: Skill = {
  id: 'talker',
  name: 'Talker',
  backing: 'llm',
  async takeTurn(ctx) {
    const system = { role: 'system', content: 'You are Lyra.' } as const;
    const result = await ctx.complete({ modality: 'text', messages: [system] });
    await ctx.complete({ modality: 'image', messages: [{ role: 'user', content: 'A gate' }] });
    await ctx.post(textContent(result.text));
  },
};

const actor = (id: string, skillIds: string[], prompt?: string): Actor => ({
  id,
  controller: 'ai',
  personality: { name: id, description: '' },
  skillIds,
  ...(prompt === undefined ? {} : { settings: { 'system-prompt': { prompt } } }),
});

function session() {
  const complete = vi.fn<ModelProvider['complete']>(({ model }) =>
    Promise.resolve({ text: 'ok', stats: { model, promptTokens: 1, completionTokens: 1 } }),
  );
  const host = loadModules(new ModuleHost(), [coreModule, systemPromptModule]);
  host.skills.register(talker);
  host.providers.register({ id: 'fake', name: 'Fake', ready: () => true, complete });
  const runtime = new SessionRuntime({
    host,
    directorId: 'least-recent',
    modelDefaults: () => ({ text: 'fake:m', image: 'fake:i' }),
  });
  return { runtime, complete };
}

describe('system prompt', () => {
  it('stays silent and adds every system prompt, in order, to text calls only', async () => {
    const { runtime, complete } = session();
    await runtime.join(actor('style', ['system-prompt'], 'Write in British English.'));
    await runtime.join(actor('format', ['system-prompt'], 'Mark speech with >.'));
    await runtime.join(actor('lyra', ['talker']));
    expect(runtime.speakers().map((a) => a.id)).toEqual(['lyra']);
    expect(runtime.cast().map((a) => a.id)).toEqual(['lyra']);

    await runtime.runTurn('lyra');
    const [text, image] = complete.mock.calls.map(([request]) => request.messages);
    expect(text?.[0]).toEqual({
      role: 'system',
      content: 'Write in British English.\n\nMark speech with >.\n\nYou are Lyra.',
    });
    expect(image).toEqual([{ role: 'user', content: 'A gate' }]);
  });

  it('adds nothing while its prompt is empty', async () => {
    const { runtime, complete } = session();
    await runtime.join(actor('blank', ['system-prompt']));
    await runtime.join(actor('lyra', ['talker']));
    await runtime.runTurn('lyra');
    expect(complete.mock.calls[0]?.[0].messages).toEqual([
      { role: 'system', content: 'You are Lyra.' },
    ]);
  });
});
