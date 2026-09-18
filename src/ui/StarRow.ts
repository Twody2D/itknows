import Phaser from 'phaser';
import { PALETTE } from '@/config/palette';

/**
 * The campaign's star rating, drawn as pixel art on the canvas rather than
 * set as a glyph.
 *
 * On the canvas and not on the DOM text layer because a star is a shape, not
 * a character: the layer exists for text the bitmap font cannot carry at UI
 * sizes, and the "★" of a system font would arrive in whatever face the
 * device happens to have, at a weight nothing else on screen shares. The
 * padlock on the same screen is drawn the same way and for the same reason.
 *
 * Axis-aligned rectangles only, so it survives the integer upscale the whole
 * game renders through (`CLAUDE.md` #2) — and no asset, which #3 requires.
 */

/** A five-pointed star, one character per pixel. Seven by seven is the smallest that still reads as a star rather than a blob. */
const STAR_ROWS = [
  '···█···',
  '··███··',
  '███████',
  '·█████·',
  '··███··',
  '·██·██·',
  '·█···█·',
] as const;

export const STAR_PX = STAR_ROWS.length;
/** Gap between two stars in a row, at scale 1. */
const STAR_GAP = 2;

/** Width of a row of `count` stars at the given pixel scale. */
export function starRowWidth(count: number, scale = 1): number {
  return count * STAR_PX * scale + Math.max(0, count - 1) * STAR_GAP * scale;
}

export interface StarRowOptions {
  /** Pixel scale; 1 draws a 7x7 star. */
  scale?: number;
  /** Colour of an earned star. */
  earnedColor?: number;
  /** Colour of a star not yet earned — drawn, never omitted, so the row always shows how many are still out there. */
  emptyColor?: number;
}

/**
 * Draws `earned` of `total` stars starting at (`x`, `y`), top-left.
 *
 * Unearned stars are drawn dim rather than left out: a row that shrinks as it
 * empties would say "this level has one star" where it means "you have one of
 * three", and the whole point of the rating is telling the player what is
 * still there to get.
 */
export function drawStarRow(
  scene: Phaser.Scene,
  x: number,
  y: number,
  earned: number,
  total: number,
  options: StarRowOptions = {},
): Phaser.GameObjects.Graphics {
  const scale = options.scale ?? 1;
  const earnedColor = options.earnedColor ?? PALETTE.reward;
  const emptyColor = options.emptyColor ?? PALETTE.goldDim;

  const g = scene.add.graphics();
  for (let index = 0; index < total; index++) {
    g.fillStyle(index < earned ? earnedColor : emptyColor, 1);
    const left = x + index * (STAR_PX + STAR_GAP) * scale;
    STAR_ROWS.forEach((row, rowIndex) => {
      // One rect per run of set pixels rather than per pixel: the same shape
      // in a quarter of the draw calls, on a screen that rebuilds this row
      // once per tile.
      let runStart: number | null = null;
      for (let col = 0; col <= row.length; col++) {
        const lit = row[col] === '█';
        if (lit && runStart === null) runStart = col;
        if (!lit && runStart !== null) {
          g.fillRect(left + runStart * scale, y + rowIndex * scale, (col - runStart) * scale, scale);
          runStart = null;
        }
      }
    });
  }
  return g;
}
