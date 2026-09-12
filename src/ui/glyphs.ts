import type { DomTextHandle, DomTextOverlay } from './DomTextOverlay';

/**
 * The mockup's small UI marks — tick, play triangle, diamond — drawn on the
 * DOM layer rather than into the game canvas.
 *
 * The canvas is 270px tall and is blown up to the viewport with
 * nearest-neighbour filtering so the hand-authored pixel art stays crisp.
 * That is right for sprites and wrong for these: a diagonal drawn into it
 * arrives as a visible staircase, which is why the tick had to be stepped by
 * hand and still read as chipped. The mockup builds all three out of plain
 * CSS boxes, and a CSS box on the DOM layer is painted by the browser at
 * native screen resolution — after the canvas upscale, like the text beside
 * it — so the edges come out smooth at any size.
 *
 * Sizes are in virtual px, matching the mockup's own numbers.
 */

/**
 * Mockup: a box with only its left and bottom borders, rotated -45°. `size`
 * is the tick's nominal box; the arms and stroke are proportions of it, so a
 * badge and a button can ask for different sizes and get the same shape.
 */
export function addCheckGlyph(
  domText: DomTextOverlay,
  vx: number,
  vy: number,
  size: number,
  color: string,
): DomTextHandle {
  const stroke = Math.max(1, size / 6);
  return domText.addShape(
    vx,
    vy,
    size * 0.52,
    size * 0.3,
    { sides: { left: [stroke, color], bottom: [stroke, color] }, rotate: -45 },
    0.5,
    0.5,
  );
}

/** Mockup: a zero-sized box whose left border is the fill and whose top and bottom borders are transparent. */
export function addPlayTriangle(
  domText: DomTextOverlay,
  vx: number,
  vy: number,
  w: number,
  h: number,
  color: string,
): DomTextHandle {
  return domText.addShape(
    vx,
    vy,
    0,
    0,
    { sides: { left: [w, color], top: [h / 2, 'transparent'], bottom: [h / 2, 'transparent'] } },
    0.5,
    0.5,
  );
}

/**
 * The same two-border box as the tick, rotated a quarter turn further so the
 * corner points sideways — every "back" and "previous/next sector" arrow in
 * the UI. Drawn with `lineStyle` into the canvas these were the worst
 * offenders of the lot: a 2px diagonal at a 6px rise arrives as three
 * disconnected steps once the canvas is upscaled.
 */
export function addChevronGlyph(
  domText: DomTextOverlay,
  vx: number,
  vy: number,
  size: number,
  color: string,
  direction: 'left' | 'right' = 'left',
): DomTextHandle {
  const stroke = Math.max(1, size / 5);
  const arm = size * 0.62;
  return domText.addShape(
    vx,
    vy,
    arm,
    arm,
    {
      sides: { left: [stroke, color], bottom: [stroke, color] },
      rotate: direction === 'left' ? 45 : -135,
    },
    0.5,
    0.5,
  );
}

/** Mockup: a plain square rotated 45°. */
export function addDiamondGlyph(
  domText: DomTextOverlay,
  vx: number,
  vy: number,
  size: number,
  color: string,
): DomTextHandle {
  return domText.addShape(vx, vy, size, size, { background: color, rotate: 45 }, 0.5, 0.5);
}
