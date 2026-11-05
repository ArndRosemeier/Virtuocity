import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { TIP_WIDTH, longPress, tipFor, tipPlace } from './touchTip';
import type { Box, Schedule } from './touchTip';

interface Shown {
  readonly text: string;
  readonly target: Box;
  /** An open modal dialog sits above the page, so a tip inside one is drawn in it. */
  readonly layer: Element;
}

const timeout: Schedule = (run, ms) => {
  const id = window.setTimeout(run, ms);
  return () => window.clearTimeout(id);
};

/** iOS never shows title tooltips, not even for a mouse or trackpad. */
const isIos = () => typeof CSS !== 'undefined' && CSS.supports('-webkit-touch-callout', 'none');

/** Swallows the click that follows lifting the finger, so showing a tip presses nothing. */
function swallowNextClick() {
  const swallow = (e: Event) => {
    e.preventDefault();
    e.stopPropagation();
  };
  document.addEventListener('click', swallow, { capture: true, once: true });
  window.setTimeout(() => document.removeEventListener('click', swallow, { capture: true }), 400);
}

/** Watches the whole page and reports which tip to show for a long press. */
function useLongPressTips(): Shown | undefined {
  const [shown, setShown] = useState<Shown>();
  useEffect(() => {
    const anyPointer = isIos();
    const press = longPress<Element>(timeout, (target) => {
      const text = tipFor(target);
      const box = target.closest('[title]')?.getBoundingClientRect();
      if (!text || !box) return false;
      const layer = target.closest('dialog[open]') ?? document.body;
      setShown({ text, layer, target: box });
      return true;
    });
    const lift = () => {
      if (press.up()) swallowNextClick();
    };
    const down = (e: PointerEvent) => {
      setShown(undefined);
      if ((e.pointerType !== 'mouse' || anyPointer) && e.target instanceof Element)
        press.down({ x: e.clientX, y: e.clientY }, e.target);
    };
    const move = (e: PointerEvent) => press.move({ x: e.clientX, y: e.clientY });
    const hide = () => {
      lift();
      setShown(undefined);
    };
    const listeners: [string, EventListener][] = [
      ['pointerdown', down as EventListener],
      ['pointermove', move as EventListener],
      ['pointerup', lift],
      ['pointercancel', lift],
      ['scroll', hide],
    ];
    listeners.forEach(([type, fn]) => document.addEventListener(type, fn, true));
    return () => listeners.forEach(([type, fn]) => document.removeEventListener(type, fn, true));
  }, []);
  return shown;
}

/**
 * Hover texts for touch screens: rest a finger on anything with a tooltip to read
 * it. Mount once near the root; it adds nothing for a mouse except on iOS.
 */
export function TouchTips() {
  const shown = useLongPressTips();
  const bubble = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(TIP_WIDTH);
  useLayoutEffect(() => {
    if (shown && bubble.current) setWidth(bubble.current.offsetWidth);
  }, [shown]);
  if (!shown) return null;
  const place = tipPlace(shown.target, window.innerWidth, width);
  return createPortal(
    <div
      ref={bubble}
      className="v-touch-tip"
      role="tooltip"
      data-above={place.above}
      style={{ left: place.x, top: place.y, maxWidth: TIP_WIDTH }}
    >
      {shown.text}
    </div>,
    shown.layer,
  );
}
