import { describe, expect, it } from 'vitest';
import { pictureSourceContract } from '@virtuocity/contract-visual';
import type { Skill } from '@virtuocity/core';
import {
  IMAGE_PART,
  ModuleHost,
  SessionRuntime,
  coreModule,
  implement,
  loadModules,
  scriptedProvider,
} from '@virtuocity/core';
import { conversationSkill } from './index';

const png = { mime: 'image/png', bytes: new Uint8Array([137, 80, 78, 71]) };

/** A picture source that always names the newest picture of the story. */
const newest: Skill = {
  id: 'newest',
  name: 'Newest',
  backing: 'code',
  implements: [
    implement(pictureSourceContract, {
      current: (_input, ctx) => {
        const picture = ctx.transcript.filter((m) => m.kind === IMAGE_PART).at(-1);
        const data = picture?.data as { assetId: string; mime: string } | undefined;
        return Promise.resolve(
          picture && data ? { picture: { ...data, alt: picture.text, messageId: picture.id } } : {},
        );
      },
    }),
  ],
};

async function session(replies: Parameters<typeof scriptedProvider>[0]) {
  const host = loadModules(new ModuleHost(), [coreModule]);
  [conversationSkill, newest].forEach((s) => host.skills.register(s));
  const provider = scriptedProvider(replies);
  host.providers.register(provider);
  const runtime = new SessionRuntime({ host, modelDefaults: () => ({ text: 'scripted:m' }) });
  const actor = (id: string, skillIds: string[]) => ({
    id,
    controller: 'ai' as const,
    personality: { name: id, description: '' },
    skillIds,
  });
  await runtime.join(actor('nano', ['conversation']));
  await runtime.join(actor('gallery', ['newest']));
  return runtime;
}

describe('pictures in a conversation', () => {
  it('posts the pictures a talking model draws, described by what it said', async () => {
    const runtime = await session([{ text: 'A fox in the snow.', media: [png] }, 'Done.']);
    await runtime.runTurn('nano');
    const [said, picture] = runtime.transcript();
    expect(said?.text).toBe('A fox in the snow.');
    expect(picture).toMatchObject({ kind: IMAGE_PART, text: 'A fox in the snow.' });
    expect(picture?.stats).toHaveLength(1);
  });

  it('shows the model the current picture, and the others by number', async () => {
    const runtime = await session([
      { text: '', media: [png] },
      { text: '', media: [png] },
      'Nice.',
    ]);
    await runtime.runTurn('nano');
    await runtime.runTurn('nano');
    await runtime.runTurn('nano');
    const messages = runtime.calls.list()[2]?.request.messages ?? [];
    expect(messages.map((m) => m.content)).toContainEqual('[Picture 1: A picture by nano]');
    const look = messages.at(-1);
    expect(look?.role).toBe('user');
    expect(look?.content).toMatchObject([
      { type: 'text', text: 'The current picture, [Picture 2: A picture by nano]:' },
      { type: 'image', mime: 'image/png' },
    ]);
  });
});
