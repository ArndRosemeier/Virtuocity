/** How long a finger rests on something before its tooltip shows. */
export const LONG_PRESS_MS = 500;
/** How far a finger may drift, in pixels, and still count as resting. */
export const MOVE_LIMIT = 10;

/** Starts a timer and returns a function that cancels it (setTimeout, injected for tests). */
export type Schedule = (run: () => void, ms: number) => () => void;

export interface Point {
  readonly x: number;
  readonly y: number;
}

/**
 * Watches one pointer at a time and calls `fire` with the pressed target once it
 * has rested for `LONG_PRESS_MS` without moving or lifting. `up` tells whether
 * this press fired, so the click that follows the lift can be ignored.
 */
export function longPress<T>(schedule: Schedule, fire: (target: T) => boolean) {
  let cancel: (() => void) | undefined;
  let start: Point | undefined;
  let fired = false;
  const stop = () => {
    cancel?.();
    cancel = undefined;
    start = undefined;
    const was = fired;
    fired = false;
    return was;
  };
  return {
    down(at: Point, target: T) {
      stop();
      start = at;
      cancel = schedule(() => {
        cancel = undefined;
        start = undefined;
        fired = fire(target);
      }, LONG_PRESS_MS);
    },
    move(at: Point) {
      if (start && Math.hypot(at.x - start.x, at.y - start.y) > MOVE_LIMIT) stop();
    },
    up: stop,
  };
}

/** Something that can look up its nearest ancestor, like a DOM element. */
export interface Closest {
  closest(selector: string): { getAttribute(name: string): string | null } | null;
}

/** The hover text (title attribute) of the target or its nearest ancestor that has one. */
export function tipFor(target: Closest): string | undefined {
  const text = target.closest('[title]')?.getAttribute('title')?.trim();
  return text ? text : undefined;
}

export interface Box {
  readonly left: number;
  readonly top: number;
  readonly width: number;
  readonly bottom: number;
}

/** Widest a tooltip bubble gets, in pixels. */
export const TIP_WIDTH = 280;
const GAP = 8;
/** Room a bubble needs above its target before it goes below instead. */
const ROOM_ABOVE = 72;

/**
 * Where a tooltip bubble `width` pixels wide goes for a target: centred over it,
 * kept inside the viewport, above it unless there is too little room, then below.
 */
export function tipPlace(target: Box, viewportWidth: number, width = TIP_WIDTH) {
  const half = Math.min(width, viewportWidth - 2 * GAP) / 2;
  const centre = target.left + target.width / 2;
  const x = Math.min(Math.max(centre, GAP + half), viewportWidth - GAP - half);
  const above = target.top >= ROOM_ABOVE;
  return { x, y: above ? target.top - GAP : target.bottom + GAP, above };
}
