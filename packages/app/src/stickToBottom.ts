import { useCallback, useEffect, useRef } from 'react';

/** How close to the end still counts as "at the end", in pixels. */
const SLACK_PX = 40;

/** Where a scrolling area stands after a scroll event. */
export interface ScrollPosition {
  /** Scroll offset now. */
  readonly top: number;
  /** Scroll offset at the previous scroll event, or where we last put it. */
  readonly previousTop: number;
  /** Pixels between the visible end and the content's end. */
  readonly belowView: number;
}

/**
 * Whether the area stays pinned to its end after a scroll event. Only scrolling up
 * lets go: content that grows before the browser reports a scroll (a reply drawn by
 * its renderer, folded parts) leaves the end out of view without the person moving.
 */
export function staysPinned(pinned: boolean, at: ScrollPosition): boolean {
  if (at.belowView <= SLACK_PX) return true;
  return at.top < at.previousTop ? false : pinned;
}

/**
 * Keeps a scrolling area at its end while its content grows or shrinks
 * (a reply streaming in, a renderer folding hidden parts), as long as the
 * person has not scrolled up to read. `pin` jumps to the end and keeps it there.
 */
export function useStickToBottom<S extends HTMLElement, C extends HTMLElement>() {
  const scroller = useRef<S>(null);
  const content = useRef<C>(null);
  const pinned = useRef(true);
  const lastTop = useRef(0);

  const toEnd = useCallback(() => {
    const s = scroller.current;
    if (!s) return;
    s.scrollTop = s.scrollHeight;
    lastTop.current = s.scrollTop;
  }, []);

  const pin = useCallback(() => {
    pinned.current = true;
    toEnd();
  }, [toEnd]);

  useEffect(() => {
    const s = scroller.current;
    const c = content.current;
    if (!s || !c) return undefined;
    const onScroll = () => {
      const top = s.scrollTop;
      const belowView = s.scrollHeight - top - s.clientHeight;
      pinned.current = staysPinned(pinned.current, {
        top,
        previousTop: lastTop.current,
        belowView,
      });
      lastTop.current = top;
    };
    const observer = new ResizeObserver(() => {
      if (pinned.current) toEnd();
    });
    s.addEventListener('scroll', onScroll);
    observer.observe(c);
    return () => {
      s.removeEventListener('scroll', onScroll);
      observer.disconnect();
    };
  }, [toEnd]);

  return { scroller, content, pin };
}
