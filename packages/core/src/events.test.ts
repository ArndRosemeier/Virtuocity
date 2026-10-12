import { describe, expect, it, vi } from 'vitest';
import { EventBus, defineEvent } from './events';

const ping = defineEvent<{ n: number }>('ping');

describe('EventBus', () => {
  it('delivers to type and wildcard subscribers', async () => {
    const bus = new EventBus();
    const typed = vi.fn();
    const any = vi.fn();
    bus.on(ping, typed);
    bus.on('*', any);
    await bus.emit(ping.create({ n: 1 }, 'tester'));
    expect(typed).toHaveBeenCalledOnce();
    expect(any.mock.calls[0]?.[0]).toMatchObject({ type: 'ping', source: 'tester' });
  });

  it('unsubscribes', async () => {
    const bus = new EventBus();
    const handler = vi.fn();
    const off = bus.on(ping, handler);
    off();
    await bus.emit(ping.create({ n: 1 }));
    expect(handler).not.toHaveBeenCalled();
  });

  it('narrows events with is()', () => {
    const e = ping.create({ n: 2 });
    expect(ping.is(e) && e.payload.n).toBe(2);
  });
});
