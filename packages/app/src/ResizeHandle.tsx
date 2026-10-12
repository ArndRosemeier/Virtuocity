import { useRef } from 'react';
import type { CSSProperties, KeyboardEvent, PointerEvent } from 'react';
import { useSetting } from './settings';
import { KEY_STEP, movedWidth, sidebarSetting, widthCss } from './sidebarWidth';

/** The layout's sidebar widths as CSS variables; unset ones keep the default. */
export function useSidebarStyle(): CSSProperties {
  const [left] = useSetting(sidebarSetting('left'));
  const [side] = useSetting(sidebarSetting('side'));
  const vars: Record<string, string> = {};
  const leftCss = widthCss(left);
  const sideCss = widthCss(side);
  if (leftCss) vars['--left-size'] = leftCss;
  if (sideCss) vars['--side-size'] = sideCss;
  return vars;
}

const KEYS: Readonly<Record<string, number>> = { ArrowLeft: -KEY_STEP, ArrowRight: KEY_STEP };

/**
 * The draggable inner edge of a sidebar. Drag it (or focus it and use the
 * arrow keys) to resize; double-click to go back to the default width. The
 * width is remembered in this browser.
 */
export function ResizeHandle({ slot }: { slot: string }) {
  const [, setWidth] = useSetting(sidebarSetting(slot));
  const ref = useRef<HTMLDivElement>(null);
  const drag = useRef<{ start: number; x: number } | null>(null);
  const current = () => ref.current?.previousElementSibling?.getBoundingClientRect().width ?? 0;
  const move = (start: number, delta: number) =>
    setWidth(String(movedWidth(slot, start, delta, window.innerWidth)));

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { start: current(), x: e.clientX };
  };
  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (drag.current) move(drag.current.start, e.clientX - drag.current.x);
  };
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const delta = KEYS[e.key];
    if (delta === undefined) return;
    e.preventDefault();
    move(current(), delta);
  };

  return (
    <div
      ref={ref}
      className={`resize-handle resize-handle--${slot}`}
      role="separator"
      aria-orientation="vertical"
      aria-label={`Resize the ${slot === 'left' ? 'left' : 'right'} sidebar`}
      title="Drag to resize, double-click to reset"
      tabIndex={0}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={() => (drag.current = null)}
      onPointerCancel={() => (drag.current = null)}
      onKeyDown={onKeyDown}
      onDoubleClick={() => setWidth('')}
    />
  );
}
