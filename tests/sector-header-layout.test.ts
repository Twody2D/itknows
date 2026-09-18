import { describe, expect, it } from 'vitest';
import {
  BAR_GAP,
  BAR_RIGHT_LIMIT,
  BAR_W,
  SCREEN_MARGIN,
  TITLE_GAP,
  TITLE_X,
  sectorHeaderLayout,
} from '@/config/sectorHeaderLayout';
import { MAX_VIRTUAL_WIDTH, MIN_VIRTUAL_WIDTH } from '@/config/display';

/**
 * The level map's header row used to place its progress bar at
 * `min(sysX - 100, 352)` and draw the sector title at a fixed size from
 * x=150, with nothing keeping the two apart. Measured live at 480px before
 * the fix: the title ran 150 -> 311 against a bar starting at 276, a 35px
 * overlap **on every sector** — `DATA DISTRICT` is only where it became
 * obvious enough to notice.
 *
 * What this file can assert is the geometry: the block fits the canvas and
 * the title is left a real budget. What it cannot assert is that the type
 * fits that budget — that needs real glyph widths, so it is checked live in
 * a browser (`DomTextOverlay.lineFitSize` does the fitting).
 */

/** Every width the game actually runs at (`ScaleController`: height fixed, width floats). */
const WIDTHS = Array.from({ length: MAX_VIRTUAL_WIDTH - MIN_VIRTUAL_WIDTH + 1 }, (_, i) => MIN_VIRTUAL_WIDTH + i);

/** "6 / 6" through "10 / 10" at 11px — measured in the browser, widened here for margin. */
const COUNTER_WIDTHS = [30, 38, 46, 54];

describe('sector header layout', () => {
  it('keeps the whole progress block on the canvas at every width', () => {
    for (const width of WIDTHS) {
      for (const counterWidth of COUNTER_WIDTHS) {
        const { counterX } = sectorHeaderLayout(width, counterWidth);
        expect(counterX + counterWidth, `counter overflows at ${width}px`).toBeLessThanOrEqual(width - SCREEN_MARGIN);
      }
    }
  });

  it('leaves the sector title a budget its longest name fits', () => {
    // The longest title the game can show is "СЕКТОР 03 · INDUSTRIAL CORE",
    // measured at 189px at the maximum size. The old layout gave it 118 at
    // 480px, which is why it overflowed instead of merely shrinking.
    for (const width of WIDTHS) {
      for (const counterWidth of COUNTER_WIDTHS) {
        const { titleMaxWidth } = sectorHeaderLayout(width, counterWidth);
        expect(titleMaxWidth, `title squeezed at ${width}px`).toBeGreaterThanOrEqual(190);
      }
    }
  });

  it('the bar never overlaps the title, at any width or counter size', () => {
    for (const width of WIDTHS) {
      for (const counterWidth of COUNTER_WIDTHS) {
        const { barX, titleMaxWidth } = sectorHeaderLayout(width, counterWidth);
        expect(TITLE_X + titleMaxWidth + TITLE_GAP).toBeLessThanOrEqual(barX);
      }
    }
  });

  it('a wide canvas keeps the mockup position rather than drifting right', () => {
    const { barX } = sectorHeaderLayout(MAX_VIRTUAL_WIDTH, 38);
    expect(barX).toBe(BAR_RIGHT_LIMIT);
  });

  it('the counter sits exactly one bar plus one gap from the bar', () => {
    const { barX, counterX } = sectorHeaderLayout(MIN_VIRTUAL_WIDTH, 38);
    expect(counterX - barX).toBe(BAR_W + BAR_GAP);
  });
});
