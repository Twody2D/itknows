/**
 * 90% dark calm scene + 10% bright accents (CLAUDE.md / master-prompt #5).
 * Every visual system pulls colors from here — never a hex literal inline.
 */
export const PALETTE = {
  bgVoid: 0x05050a,
  bgGraphite: 0x0d0d16,
  bgIndigo: 0x14142a,

  cyan: 0x4df2ff,
  danger: 0xff4d4d,
  dangerAlt: 0xff9a4d,
  system: 0xb24dff,
  white: 0xf5f5ff,
  reward: 0xffe14d,

  outline: 0x000000,
} as const;

export type PaletteKey = keyof typeof PALETTE;
