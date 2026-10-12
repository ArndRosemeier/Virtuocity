import { describe, expect, it } from 'vitest';
import { MIN_WIDTH, clampWidth, movedWidth, sidebarSetting, widthCss } from './sidebarWidth';

describe('sidebar width', () => {
  it('keeps widths between the minimum and a share of the window', () => {
    expect(clampWidth(100, 1600)).toBe(MIN_WIDTH);
    expect(clampWidth(500.4, 1600)).toBe(500);
    expect(clampWidth(1200, 1600)).toBe(720);
    expect(clampWidth(400, 300)).toBe(MIN_WIDTH);
  });

  it('grows the left sidebar to the right and the others to the left', () => {
    expect(movedWidth('left', 300, 50, 1600)).toBe(350);
    expect(movedWidth('side', 300, 50, 1600)).toBe(250);
    expect(movedWidth('side', 300, -50, 1600)).toBe(350);
  });

  it('turns stored values into CSS, falling back to the default', () => {
    expect(widthCss('')).toBeUndefined();
    expect(widthCss('abc')).toBeUndefined();
    expect(widthCss('0')).toBeUndefined();
    expect(widthCss('400')).toBe('min(400px, 45vw)');
    expect(sidebarSetting('side').key).toBe('virtuocity.sidebar.side');
  });
});
