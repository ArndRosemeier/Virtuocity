import { describe, expect, it } from 'vitest';
import { CHANNELS, channelContents, channelsDoc, defineChannel, showOnChannel } from './channels';
import { coreModule } from './core-module';
import { ModuleHost, loadModules } from './module';
import { SessionRuntime } from './runtime';

const scene = defineChannel({
  id: 'scene',
  title: 'Scene',
  description: 'The current scene',
  accepts: ['image'],
});

function session() {
  let t = 0;
  return new SessionRuntime({
    host: loadModules(new ModuleHost(), [coreModule]),
    modelDefaults: () => ({}),
    now: () => ++t,
  });
}

describe('channels', () => {
  it('rejects ids that are not slugs', () => {
    expect(() => defineChannel({ ...scene, id: 'Scene View' })).toThrow('Invalid channel id');
  });

  it('shows the latest content per channel, with who put it there', async () => {
    const s = session();
    const painter = s.workspace.view('ink');
    await showOnChannel(painter, scene, { kind: 'image', data: 'first' });
    await showOnChannel(painter, scene, { kind: 'image', data: 'second' });
    expect(channelContents(s.workspace.view('user'))).toEqual({
      scene: { part: { kind: 'image', data: 'second' }, actorId: 'ink', at: expect.any(Number) },
    });
  });

  it('refuses parts the channel cannot show', async () => {
    const s = session();
    await expect(
      showOnChannel(s.workspace.view('ink'), scene, { kind: 'audio', data: 'x' }),
    ).rejects.toThrow('cannot show "audio"');
  });

  it('clears a channel, and rewinds with the story', async () => {
    const s = session();
    const view = s.workspace.view('ink');
    await showOnChannel(view, scene, { kind: 'image', data: 'first' });
    const head = s.workspace.log.head;
    await view.change(CHANNELS, channelsDoc, { type: 'clear', channelId: 'scene' });
    expect(channelContents(view)).toEqual({});
    await s.workspace.load(s.workspace.log.all(), head);
    expect(channelContents(view).scene?.part.data).toBe('first');
  });
});
