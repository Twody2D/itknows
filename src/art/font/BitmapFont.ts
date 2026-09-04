import { GLYPHS, GLYPH_HEIGHT, glyphWidth } from './glyphs';

const LETTER_GAP = 1;
const LINE_GAP = 2;

export interface TextMetrics {
  width: number;
  height: number;
}

function lineWidth(chars: string[]): number {
  if (chars.length === 0) return 0;
  let width = 0;
  for (const ch of chars) width += glyphWidth(ch) + LETTER_GAP;
  return width - LETTER_GAP;
}

/** Greedy word-wrap to a max width, in font-pixels (pre-`pixelScale`). */
export function wrapText(text: string, maxWidth: number): string[] {
  const words = text.toUpperCase().split(' ');
  const lines: string[] = [];
  let current = '';

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (current && lineWidth(candidate.split('')) > maxWidth) {
      lines.push(current);
      current = word;
    } else {
      current = candidate;
    }
  }
  if (current) lines.push(current);
  return lines.length > 0 ? lines : [''];
}

/** Width/height in font-pixels (before `pixelScale`) a (possibly multi-line) string would occupy. */
export function measureLines(lines: string[]): TextMetrics {
  const width = Math.max(0, ...lines.map((line) => lineWidth(line.split(''))));
  const height = lines.length * GLYPH_HEIGHT + Math.max(0, lines.length - 1) * LINE_GAP;
  return { width, height };
}

/**
 * Draws glyph pixels hard-edged at `pixelScale` size onto a scratch canvas —
 * bit-for-bit the same shapes/sizing the font always drew, just isolated on
 * its own canvas so the blur pass below can't bleed onto anything else.
 */
function drawLinesHard(ctx: CanvasRenderingContext2D, lines: string[], color: string, pixelScale: number): void {
  ctx.fillStyle = color;

  for (let li = 0; li < lines.length; li++) {
    let cursorX = 0;
    const lineY = li * (GLYPH_HEIGHT + LINE_GAP) * pixelScale;

    for (const ch of lines[li]!) {
      const rows = GLYPHS[ch];
      if (rows) {
        for (let row = 0; row < rows.length; row++) {
          const bits = rows[row]!;
          for (let col = 0; col < bits.length; col++) {
            if (bits[col] === '1') ctx.fillRect(cursorX + col * pixelScale, lineY + row * pixelScale, pixelScale, pixelScale);
          }
        }
      }
      cursorX += (glyphWidth(ch) + LETTER_GAP) * pixelScale;
    }
  }
}

/**
 * A fixed-radius blur, proportional to `pixelScale` but capped — not a
 * bilinear upscale of the tiny native bitmap. An upscale-driven blend (draw
 * at 1px-per-bit, then `drawImage` it stretched to size with smoothing on)
 * was tried first and looked wrong: bilinear interpolation ramps linearly
 * across the *entire* gap between two source texels, so stretching a 5-7px
 * glyph by e.g. 4x turned a whole letter into a foggy smear — correct
 * bilinear math, but nowhere near how gently Minecraft's own font actually
 * softens. A small blur kernel in output pixels, independent of how few
 * native pixels the glyph started from, reads as "smoothed" instead of
 * "melted" at every text size in the game.
 */
function blurRadiusPx(pixelScale: number): number {
  return Math.min(0.7, Math.max(0.3, pixelScale * 0.15));
}

/**
 * The one deliberate exception to "every pixel in this game is hard-edged"
 * (CLAUDE.md #2/#3): text specifically gets a soft, antialiased edge —
 * approved explicitly by the project owner to match the reference look
 * (Minecraft's own menu font), scoped to `BitmapFont`/`PixelLabel` only.
 * Every other system (sprites, tiles, FX, background) is untouched and
 * still renders through `pixelArt: true` / `antialias: false` exactly as
 * before — only this module ever sets a canvas `filter`.
 */
export function drawLines(
  ctx: CanvasRenderingContext2D,
  lines: string[],
  x: number,
  y: number,
  color: string,
  pixelScale = 1,
): void {
  const { width, height } = measureLines(lines);
  const blur = blurRadiusPx(pixelScale);
  // Padding so the blur has room to fall off at the block's own edges
  // instead of being hard-clipped by the scratch canvas bounds.
  const pad = Math.ceil(blur * 3);
  const w = Math.max(1, width) * pixelScale;
  const h = Math.max(1, height) * pixelScale;

  const scratch = document.createElement('canvas');
  scratch.width = w + pad * 2;
  scratch.height = h + pad * 2;
  const sctx = scratch.getContext('2d');
  if (!sctx) return;
  sctx.imageSmoothingEnabled = false;
  sctx.translate(pad, pad);
  drawLinesHard(sctx, lines, color, pixelScale);

  ctx.save();
  ctx.filter = `blur(${blur}px)`;
  ctx.drawImage(scratch, x - pad, y - pad);
  ctx.restore();
}
