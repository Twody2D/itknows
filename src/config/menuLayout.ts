/**
 * Main-menu layout, in virtual pixels on the W x 270 canvas (W = 480..620).
 *
 * Every interactive element is positioned from the LEFT edge in absolute
 * pixels, which is what makes the menu width-proof: at any supported width
 * the controls sit in identical places inside the 480px safe zone, and extra
 * width only ever adds atmosphere on the right (CLAUDE.md #2 — nothing
 * gameplay- or UI-critical may need more than MIN_VIRTUAL_WIDTH). Only the
 * SYSTEM readouts are right-anchored, and the two decorative blocks below
 * declare the width they need before they're allowed to appear.
 *
 * This lives in config rather than inline in the scene so `tests/
 * menu-layout.test.ts` can assert the safe-zone and no-overlap guarantees
 * directly, instead of leaving them to be re-checked by eye after every
 * tweak.
 */
export const MENU_LAYOUT = {
  showcase: { x: 0, y: 0, w: 150, h: 270 },
  showcaseHeader: { x: 0, y: 0, w: 150, h: 22 },
  /**
   * The android stands on the pedestal: horizontal centre, the Y its feet
   * rest on, and an integer sprite scale. The source frame is 24x36, so 2x
   * gives 48x72 — near the 38x56 the design mocked up with CSS boxes, and
   * the closest fit that stays a whole-number multiple. A fractional scale
   * would sample the pixel art unevenly, doubling some rows of pixels and
   * not others (CLAUDE.md #2 — no half-pixels in the render).
   */
  character: { cx: 75, footY: 152, scale: 2 },
  pedestal: { x: 52, y: 152, w: 46, h: 6 },
  creditsCounter: { x: 26, y: 210, w: 98, h: 26 },
  logo: { x: 166, y: 34 },

  /** Anchored to the right edge by this inset, so they follow the canvas as it widens. */
  systemStatus: { rightInset: 10, y: 9 },
  version: { rightInset: 10, y: 23 },

  /**
   * SYSTEM's spoken line. Right-anchored, and its width is what gives, not
   * its position: the design tabulated a fixed 196px measured on a 620px
   * canvas, which at the 560px it also declared as the threshold would have
   * put the line straight through the SETTINGS button. So it takes whatever
   * room is left between the command grid and the right edge, up to `maxW`,
   * and disappears entirely below `minW` rather than being squeezed into
   * something unreadable.
   */
  systemLine: { rightInset: 12, y: 232, maxW: 196, minW: 130, h: 26, minWidth: 560 },
  serverRack: { x: 492, y: 96, w: 96, h: 120, minWidth: 590 },
} as const;

/**
 * The controls, separated out because they carry the hard guarantee: each
 * must sit wholly inside the safe zone and none may overlap another.
 */
export const MENU_TILES = {
  changeSkin: { x: 26, y: 176, w: 98, h: 22 },
  play: { x: 166, y: 88, w: 230, h: 60 },
  levels: { x: 166, y: 160, w: 120, h: 46 },
  shop: { x: 290, y: 160, w: 120, h: 46 },
  help: { x: 166, y: 214, w: 120, h: 46 },
  settings: { x: 290, y: 214, w: 120, h: 46 },
} as const;

export type MenuTileKey = keyof typeof MENU_TILES;

/** Right edge of the command grid — the boundary anything right-anchored has to clear. */
export const MENU_GRID_RIGHT = MENU_TILES.settings.x + MENU_TILES.settings.w;

/** Width the SYSTEM line gets on this canvas, or `0` when there isn't enough room to show it at all. */
export function systemLineWidth(canvasWidth: number): number {
  const slot = MENU_LAYOUT.systemLine;
  if (canvasWidth < slot.minWidth) return 0;
  const available = canvasWidth - slot.rightInset - MENU_GRID_RIGHT;
  return available >= slot.minW ? Math.min(slot.maxW, available) : 0;
}
