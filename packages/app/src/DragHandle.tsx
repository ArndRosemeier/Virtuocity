import { useRef } from 'react';
import type { KeyboardEvent, PointerEvent } from 'react';

/** How far one arrow key press moves an edge, in pixels. */
export const KEY_STEP = 16;

/**
 * A draggable edge. Drag it (or focus it and use the arrow keys) to resize
 * what it belongs to; double-click to reset. `size` reads the current size,
 * `onMove` gets that size at the start of the drag and how far the pointer moved.
 */
export function DragHandle({
  axis,
  className,
  label,
  size,
  onMove,
  onReset,
}: {
  /** `x` resizes a width (left/right arrows), `y` a height (up/down arrows). */
  axis: 'x' | 'y';
  className: string;
  label: string;
  size: (handle: HTMLDivElement) => number;
  onMove: (start: number, delta: number) => void;
  onReset: () => void;
}) {
  const drag = useRef<{ start: number; at: number } | null>(null);
  const at = (e: PointerEvent) => (axis === 'x' ? e.clientX : e.clientY);
  const keys: Readonly<Record<string, number>> =
    axis === 'x'
      ? { ArrowLeft: -KEY_STEP, ArrowRight: KEY_STEP }
      : { ArrowUp: -KEY_STEP, ArrowDown: KEY_STEP };

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { start: size(e.currentTarget), at: at(e) };
  };
  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (drag.current) onMove(drag.current.start, at(e) - drag.current.at);
  };
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const delta = keys[e.key];
    if (delta === undefined) return;
    e.preventDefault();
    onMove(size(e.currentTarget), delta);
  };

  return (
    <div
      className={className}
      role="separator"
      aria-orientation={axis === 'x' ? 'vertical' : 'horizontal'}
      aria-label={label}
      title="Drag to resize, double-click to reset"
      tabIndex={0}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={() => (drag.current = null)}
      onPointerCancel={() => (drag.current = null)}
      onKeyDown={onKeyDown}
      onDoubleClick={onReset}
    />
  );
}
