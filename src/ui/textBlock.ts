import { DEFAULT_LINE_HEIGHT } from '@/ui/DomTextOverlay';

/**
 * How many lines of `sizePx` text fit in `roomPx` of vertical space.
 *
 * This is the arithmetic behind every `clampLines` that has something pinned
 * underneath it. It exists as its own function because the level map got it
 * wrong in the way a hand-picked number always eventually does: the stats box
 * asked for three lines because three was what the text took at the width it
 * was written at, and at 480 px the label above it wrapped to two lines,
 * pushed the block down, and the third line printed straight through
 * «ЗВЁЗДЫ СЕКТОРА», which is pinned to the bottom of the same box.
 *
 * Never returns 0: a box with no room left is a layout bug, and hiding the
 * text would hide the bug rather than show it.
 */
export function linesThatFit(roomPx: number, sizePx: number, lineHeight: number = DEFAULT_LINE_HEIGHT): number {
  if (sizePx <= 0 || lineHeight <= 0) return 1;
  // The epsilon is not decoration: a box sized to hold exactly N lines
  // divides to 9.999999999999998, and a bare `floor` then throws away a line
  // that fits — which is how a measured clamp starts truncating text for no
  // reason a reader can see.
  return Math.max(1, Math.floor(roomPx / (sizePx * lineHeight) + 1e-9));
}

/** The height a block of `lines` lines of `sizePx` text occupies — the inverse of {@link linesThatFit}. */
export function blockHeightPx(lines: number, sizePx: number, lineHeight: number = DEFAULT_LINE_HEIGHT): number {
  return lines * sizePx * lineHeight;
}
