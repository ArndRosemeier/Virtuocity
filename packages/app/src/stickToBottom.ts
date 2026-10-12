import { useCallback, useEffect, useRef } from 'react';

/** How close to the end still counts as "at the end", in pixels. */
const SLACK_PX = 40;

/**
 * Keeps a scrolling area at its end while its content grows or shrinks
 * (a reply streaming in, a renderer folding hidden parts), as long as the
 * person has not scrolled up to read. `pin` jumps to the end and keeps it there.
 */
export function useStickToBottom<S extends HTMLElement, C extends HTMLElement>() {
  const scroller = useRef<S>(null);
  const content = useRef<C>(null);
  const pinned = useRef(true);

  const pin = useCallback(() => {
    pinned.current = true;
    const s = scroller.current;
    if (s) s.scrollTop = s.scrollHeight;
  }, []);

  useEffect(() => {
    const s = scroller.current;
    const c = content.current;
    if (!s || !c) return undefined;
    const onScroll = () => {
      pinned.current = s.scrollHeight - s.scrollTop - s.clientHeight <= SLACK_PX;
    };
    const observer = new ResizeObserver(() => {
      if (pinned.current) s.scrollTop = s.scrollHeight;
    });
    s.addEventListener('scroll', onScroll);
    observer.observe(c);
    return () => {
      s.removeEventListener('scroll', onScroll);
      observer.disconnect();
    };
  }, []);

  return { scroller, content, pin };
}
