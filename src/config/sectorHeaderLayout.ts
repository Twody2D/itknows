/**
 * Geometry of the level map's sector header row (`LevelSelectScene`).
 *
 * Pure and outside the scene so it can be asserted without a browser, the
 * same reason `config/menuLayout.ts` exists. What it CANNOT decide is type
 * size: that depends on measuring real glyphs, which only the DOM can do
 * (`DomTextOverlay.lineFitSize`). So this hands out the *budget* and the
 * scene fits its type into it — and the live check is what proves the type
 * actually fits, not this file.
 *
 * The row is: back arrow, screen title ("Уровни"), sector title, progress
 * bar, cleared counter. It runs inside the top bar band, above everything
 * else on the screen — the SYSTEM column below starts at y=38.
 */

/** Left edge of the sector title, from the mockup. */
export const TITLE_X = 150;
/** Largest type size for the sector title; it shrinks from here to fit. */
export const TITLE_MAX_PX = 10;
/** Clear space the sector title must leave before the progress bar. */
export const TITLE_GAP = 8;
/** Progress bar width, and the gap between it and its counter. */
export const BAR_W = 60;
export const BAR_GAP = 6;
/** Margin kept at the right edge of the canvas, matching the screen's other margins. */
export const SCREEN_MARGIN = 8;
/**
 * The mockup's own position for the bar, drawn at a fixed 620px width. The
 * bar never goes further right than this: on a wide canvas the header would
 * otherwise drift away from the map it describes.
 */
export const BAR_RIGHT_LIMIT = 352;

export interface SectorHeaderBoxes {
  /** Left edge of the progress bar. */
  barX: number;
  /** Left edge of the cleared counter. */
  counterX: number;
  /** Room the sector title has before it would touch the bar. */
  titleMaxWidth: number;
}

/**
 * Places the progress block flush right, then gives the sector title whatever
 * is left.
 *
 * The bar used to sit at `min(sysX - 100, 352)`, which on a 480px canvas is
 * 276 — 88px further left than the row can hold — and the title, drawn at a
 * fixed size from x=150, ran straight into it: a measured 35px overlap on
 * every sector. The `sysX - 100` guard was keeping the bar clear of the
 * SYSTEM column, but that column starts 19px BELOW this row, so there was
 * never anything beside the bar to avoid.
 *
 * `counterWidth` is measured by the caller, because "6 / 6" and "10 / 10"
 * are not the same width and the number of levels in a sector is not this
 * module's business.
 */
export function sectorHeaderLayout(canvasWidth: number, counterWidth: number): SectorHeaderBoxes {
  const barX = Math.min(BAR_RIGHT_LIMIT, Math.round(canvasWidth - SCREEN_MARGIN - counterWidth - BAR_GAP - BAR_W));
  return {
    barX,
    counterX: barX + BAR_W + BAR_GAP,
    titleMaxWidth: barX - TITLE_X - TITLE_GAP,
  };
}
