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
 * Draws hard-edge glyph pixels onto a 2D context — no anti-aliasing, ever
 * (that's what keeps this crisp when the whole game canvas is later
 * nearest-neighbour-scaled). `ctx` should have `imageSmoothingEnabled =
 * false` already set by the caller (canvases created via `makeCanvas` in
 * `SpriteFactory` follow that convention).
 */
export function drawLines(
  ctx: CanvasRenderingContext2D,
  lines: string[],
  x: number,
  y: number,
  color: string,
  pixelScale = 1,
): void {
  ctx.fillStyle = color;

  for (let li = 0; li < lines.length; li++) {
    let cursorX = x;
    const lineY = y + li * (GLYPH_HEIGHT + LINE_GAP) * pixelScale;

    for (const ch of lines[li]!) {
      const rows = GLYPHS[ch];
      if (rows) {
        for (let row = 0; row < rows.length; row++) {
          const bits = rows[row]!;
          for (let col = 0; col < bits.length; col++) {
            if (bits[col] === '1') {
              ctx.fillRect(cursorX + col * pixelScale, lineY + row * pixelScale, pixelScale, pixelScale);
            }
          }
        }
      }
      cursorX += (glyphWidth(ch) + LETTER_GAP) * pixelScale;
    }
  }
}
