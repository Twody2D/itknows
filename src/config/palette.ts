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

  /**
   * Main-menu control tones. The menu's buttons are lit, physical objects —
   * a gradient face over a darker "sole" that disappears when pressed — so
   * each state needs its own step of the same hue rather than one accent
   * re-used at different alphas, which is what the rest of the UI kit does.
   */
  cyanBright: 0x7ff6ff,
  cyanGlow: 0xbffcff,
  cyanPress: 0x35c7d6,
  cyanSoleHover: 0x2c93a3,
  cyanEdge: 0xc9fbff,
  panelHover: 0x1f2140,

  /** Gold is the money channel only — the credits counter and the shop tile's accent, never decoration. */
  goldDim: 0x4a3d14,
  goldEdge: 0xa8912b,

  /** THE SYSTEM's quieter registers: version/technical text, and its spoken line. */
  systemMuted: 0x8a6bb0,
  systemLight: 0xd9a6ff,

  textMuted: 0xc9cee4,
  textDisabled: 0x4a5068,

  /** Skin tones for `patrol`/`echo` (`data/shop/skinVisuals.ts`) — chosen to stay ≥24° apart in hue from every other visor and from the reserved danger red (design round 2, 2026-09-06). */
  patrolBody: 0x3e5a7a,
  patrolVisor: 0x5cff8a,
  echoBody: 0xb8c4e0,
  echoVisor: 0xff7de0,

  /** Muted blue-gray for small secondary labels (TIME/BEST/leaderboard captions) — distinct from `textMuted` (much lighter) and `systemMuted` (purple-shifted). `SectorCompleteScene`, design round 2. */
  labelMuted: 0x8a93b0,

  outline: 0x000000,
} as const;

export type PaletteKey = keyof typeof PALETTE;
