/**
 * 90% dark calm scene + 10% bright accents (CLAUDE.md / master-prompt #5).
 * Every visual system pulls colors from here — never a hex literal inline.
 */
export const PALETTE = {
  bgVoid: 0x05050a,
  bgGraphite: 0x0d0d16,
  bgIndigo: 0x14142a,

  /** Parallax depth layers, back to front — desaturated so foreground color reads as the "loud" layer. */
  layerFar: 0x0a0a16,
  layerMid: 0x11111f,
  layerNear: 0x181828,

  /** Structural material tones for platform/ground segments — not a single repeating tile color. */
  metalDark: 0x0b0b14,
  metalMid: 0x17172a,
  metalEdge: 0x2a2a42,

  cyan: 0x4df2ff,
  cyanDim: 0x1f6b78,
  danger: 0xff4d4d,
  dangerAlt: 0xff9a4d,
  system: 0xb24dff,
  systemDim: 0x4a2d66,
  white: 0xf5f5ff,
  reward: 0xffe14d,

  outline: 0x000000,
} as const;

export type PaletteKey = keyof typeof PALETTE;
