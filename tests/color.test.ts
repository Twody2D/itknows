import { describe, expect, it } from 'vitest';
import { hexToCss } from '@/utils/color';

describe('hexToCss', () => {
  it('converts an opaque hex color to rgb()', () => {
    expect(hexToCss(0xff0000)).toBe('rgb(255,0,0)');
    expect(hexToCss(0x00ff00)).toBe('rgb(0,255,0)');
    expect(hexToCss(0x0000ff)).toBe('rgb(0,0,255)');
  });

  it('converts a translucent hex color to rgba()', () => {
    expect(hexToCss(0xffffff, 0.5)).toBe('rgba(255,255,255,0.5)');
  });
});
