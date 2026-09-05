import { describe, expect, it } from 'vitest';
import { hexToCss, lerpColor } from '@/utils/color';

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

describe('lerpColor', () => {
  it('returns the start color at t=0 and the end color at t=1', () => {
    expect(lerpColor(0x000000, 0xffffff, 0)).toBe(0x000000);
    expect(lerpColor(0x000000, 0xffffff, 1)).toBe(0xffffff);
  });

  it('interpolates each channel independently at the midpoint', () => {
    expect(lerpColor(0x000000, 0xff00ff, 0.5)).toBe(0x800080);
  });

  it('clamps t outside [0,1] instead of extrapolating past either endpoint', () => {
    expect(lerpColor(0x102030, 0x405060, -1)).toBe(0x102030);
    expect(lerpColor(0x102030, 0x405060, 2)).toBe(0x405060);
  });
});
