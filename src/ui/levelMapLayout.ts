/**
 * The level map's SYSTEM column, as numbers instead of as a drawing.
 *
 * WHY THIS IS NOT JUST INSIDE THE SCENE. Twice now the same defect has
 * shipped from this column: a text block clamped to a hand-picked line count,
 * printing through the row pinned below it. Both times it was repaired by
 * deriving the clamp from the room — and the test written to hold that
 * repair could not see the room, because the room lives in
 * `LevelSelectScene`, which needs Phaser. So the test restated the numbers:
 * `const room = 158 + 96 - 22 - 6 - 196; expect(room).toBe(30)`, which is
 * arithmetic on five literals and cannot fail. Reverting the scene to the
 * shipped bug left the whole suite green.
 *
 * The geometry lives here so that one definition answers both: the scene
 * draws from it, `tests/text-block.test.ts` measures it, and a change to
 * either reaches the other. Same split `gameplay/stars.ts` and
 * `gameplay/conveyor.ts` already use for rules the browser would otherwise
 * be the only witness to.
 */

/** SYSTEM's running-line panel, above the stats box. */
export const MAP_SYS_PANEL = {
  top: 38,
  height: 110,
  /** Where the line itself starts — under the panel's own caption. */
  textTop: 56,
  padBottom: 6,
} as const;

/**
 * The stats box under it. Grown from the mockup's 80 to carry the sector's
 * star count under the best time; it ends at 254 on a 270-tall canvas, which
 * is the same bottom margin the map's own tiles keep.
 */
export const MAP_STATS_PANEL = {
  top: 158,
  height: 96,
  /** The star row is pinned this far above the box's bottom edge. */
  starsFromBottom: 22,
  /** Top of the "best time" caption. */
  labelTop: 166,
  /** Gap under the caption, and again above the star row. */
  gap: 6,
} as const;

/** Vertical room SYSTEM's line has, in px. */
export function sysCommentRoomPx(): number {
  return MAP_SYS_PANEL.top + MAP_SYS_PANEL.height - MAP_SYS_PANEL.textTop - MAP_SYS_PANEL.padBottom;
}

/** Y of the star row inside the stats box. */
export function statsStarRowY(): number {
  return MAP_STATS_PANEL.top + MAP_STATS_PANEL.height - MAP_STATS_PANEL.starsFromBottom;
}

/**
 * Y where the best-time value starts, under a caption of the measured
 * height. A fixed offset worked only while that caption fit one line; a wider
 * technical face wraps it to two and the value prints straight through it.
 */
export function statsValueY(labelHeightPx: number): number {
  return MAP_STATS_PANEL.labelTop + Math.ceil(labelHeightPx) + MAP_STATS_PANEL.gap;
}

/** Vertical room the best-time value has above the star row, in px. */
export function statsValueRoomPx(labelHeightPx: number): number {
  return statsStarRowY() - MAP_STATS_PANEL.gap - statsValueY(labelHeightPx);
}
