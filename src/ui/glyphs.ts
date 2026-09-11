import type Phaser from 'phaser';

/**
 * The mockup's tick, drawn as pixel art on whole pixels.
 *
 * The mockup builds it in CSS from one box with a left and a bottom border
 * rotated -45°, which is two strokes of identical weight meeting at a right
 * angle. A rotated rectangle can't be copied literally here: the canvas is
 * 270px tall and gets blown up with nearest-neighbour filtering, so anything
 * drawn off the pixel grid arrives as a smeared, ragged edge. It is stepped
 * instead — one column of the stroke per pixel of travel, which is what a
 * 45° line looks like when it is drawn rather than rotated.
 *
 * Every column is the same `2u` tall. That uniform weight is the whole point:
 * the version this replaces mixed 1u and 2u columns along the two arms, and
 * the tick came out visibly chipped, thin in the middle of a stroke and
 * blunt at the ends.
 *
 * `size` is the nominal glyph size in virtual px; the stroke is a third of
 * it, at least one pixel.
 */
export function drawCheck(
  g: Phaser.GameObjects.Graphics,
  cx: number,
  cy: number,
  size: number,
  color: number,
): void {
  const u = Math.max(1, Math.round(size / 3));
  // Top offset of each column, in units of `u`: down three, then up four.
  const columns = [2, 3, 4, 3, 2, 1, 0];
  const left = Math.round(cx - (columns.length * u) / 2);
  const top = Math.round(cy - 3 * u);
  g.fillStyle(color, 1);
  columns.forEach((dy, i) => g.fillRect(left + i * u, top + dy * u, u, 2 * u));
}
