import { describe, expect, it } from 'vitest';
import { LONG_PRESS_MS, TIP_WIDTH, longPress, tipFor, tipPlace } from './touchTip';
import type { Closest, Schedule } from './touchTip';

function fakeTimers() {
  const pending: { run: () => void; ms: number; live: boolean }[] = [];
  const schedule: Schedule = (run, ms) => {
    const timer = { run, ms, live: true };
    pending.push(timer);
    return () => (timer.live = false);
  };
  const elapse = () =>
    pending
      .filter((t) => t.live)
      .forEach((t) => {
        t.live = false;
        t.run();
      });
  return { schedule, pending, elapse };
}

describe('longPress', () => {
  it('fires with the target after resting, and the lift says so once', () => {
    const timers = fakeTimers();
    const fired: string[] = [];
    const press = longPress<string>(timers.schedule, (t) => fired.push(t) > 0);
    press.down({ x: 0, y: 0 }, 'button');
    expect(timers.pending[0]?.ms).toBe(LONG_PRESS_MS);
    timers.elapse();
    expect(fired).toEqual(['button']);
    expect(press.up()).toBe(true);
    expect(press.up()).toBe(false);
  });

  it('lets the lift through when there was nothing to show', () => {
    const timers = fakeTimers();
    const press = longPress<string>(timers.schedule, () => false);
    press.down({ x: 0, y: 0 }, 'plain text');
    timers.elapse();
    expect(press.up()).toBe(false);
  });

  it('does not fire when lifted early', () => {
    const timers = fakeTimers();
    const fired: string[] = [];
    const press = longPress<string>(timers.schedule, (t) => fired.push(t) > 0);
    press.down({ x: 0, y: 0 }, 'button');
    expect(press.up()).toBe(false);
    timers.elapse();
    expect(fired).toEqual([]);
  });

  it('ignores small drift but cancels on a real move, such as a scroll', () => {
    const timers = fakeTimers();
    const fired: string[] = [];
    const press = longPress<string>(timers.schedule, (t) => fired.push(t) > 0);
    press.down({ x: 0, y: 0 }, 'a');
    press.move({ x: 3, y: 4 });
    timers.elapse();
    press.down({ x: 0, y: 0 }, 'b');
    press.move({ x: 0, y: 30 });
    timers.elapse();
    expect(fired).toEqual(['a']);
  });
});

const element = (title: string | null): Closest => ({
  closest: () => (title === null ? null : { getAttribute: () => title }),
});

describe('tipFor', () => {
  it('reads the nearest title', () => {
    expect(tipFor(element('Contracts: director'))).toBe('Contracts: director');
  });
  it('has nothing for untitled or blank targets', () => {
    expect(tipFor(element(null))).toBeUndefined();
    expect(tipFor(element('  '))).toBeUndefined();
  });
});

describe('tipPlace', () => {
  it('goes above a target with room, centred on it', () => {
    const place = tipPlace({ left: 400, top: 300, width: 40, bottom: 330 }, 1000);
    expect(place).toEqual({ x: 420, y: 292, above: true });
  });
  it('goes below a target near the top', () => {
    const place = tipPlace({ left: 400, top: 10, width: 40, bottom: 40 }, 1000);
    expect(place.above).toBe(false);
    expect(place.y).toBe(48);
  });
  it('stays inside the viewport at the edges', () => {
    const right = tipPlace({ left: 980, top: 300, width: 20, bottom: 320 }, 1000);
    expect(right.x).toBe(1000 - 8 - TIP_WIDTH / 2);
    const left = tipPlace({ left: 0, top: 300, width: 20, bottom: 320 }, 1000);
    expect(left.x).toBe(8 + TIP_WIDTH / 2);
  });
  it('lets a narrow bubble sit closer to the edge', () => {
    const place = tipPlace({ left: 980, top: 300, width: 20, bottom: 320 }, 1000, 60);
    expect(place.x).toBe(1000 - 8 - 30);
  });
});
