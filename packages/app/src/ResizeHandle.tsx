import type { CSSProperties } from 'react';
import { DragHandle } from './DragHandle';
import { useSetting } from './settings';
import { movedWidth, sidebarSetting, widthCss } from './sidebarWidth';

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

/** The inner edge of a sidebar; its width is remembered in this browser. */
export function ResizeHandle({ slot }: { slot: string }) {
  const [, setWidth] = useSetting(sidebarSetting(slot));
  return (
    <DragHandle
      axis="x"
      className={`resize-handle resize-handle--${slot}`}
      label={`Resize the ${slot === 'left' ? 'left' : 'right'} sidebar`}
      size={(handle) => handle.previousElementSibling?.getBoundingClientRect().width ?? 0}
      onMove={(start, delta) => setWidth(String(movedWidth(slot, start, delta, window.innerWidth)))}
      onReset={() => setWidth('')}
    />
  );
}
