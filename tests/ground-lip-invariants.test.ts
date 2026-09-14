import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/** Source with comments stripped — these files explain the old overlay at length, and it is only the calls that matter. */
const read = (rel: string): string =>
  readFileSync(resolve(__dirname, '..', rel), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');

/**
 * The bright cyan lip along the top of the floor belongs to the TILE, never
 * to a shape laid over it.
 *
 * It used to be a `Rectangle` per contiguous run of ground, plus one per
 * trapdoor and one per sliding slab, all at the same y. Where two of them
 * met the shared pixel came out unpainted — the tile's own dim lip showing
 * through a one-pixel gap in the bright one. The game runs at a fixed
 * virtual height of 270 stretched to the window, so on the owner's screen
 * that pixel was drawn three to four wide: a dark tick sitting exactly at
 * the seam between the floor and the part of it about to drop away. It was
 * measured at world col 37 on BOOT, 15/25/35/42 on DROP, 13 on SHIFT, 15 on
 * ASCENT, 38 on BOOT COMPLETE, 40 on BEAM and 15 on GHOST FLOOR — every one
 * of them a trapdoor or a shifting pit, which is the one thing the floor
 * must never advertise (CLAUDE.md #4).
 *
 * Tiles are textured quads and butt together exactly. So `drawGroundTop`
 * and `drawPlatformSlab` each paint the lip themselves and nothing paints
 * it again on top. This test is here to stop the next "just overlay one
 * bright rim across the run" from bringing the tick back.
 */
describe('the ground lip lives in the tile, not in an overlay', () => {
  const floorLipShape = /add\s*\n?\s*\.?rectangle\([^)]*PALETTE\.cyan[^)]*\)/;

  it('a run of ground paints no rim over itself', () => {
    const src = read('src/gameplay/Level.ts');
    // The side walls keep their own vertical cyan edge — it is depth -4,
    // decorative, and never meets another shape end to end.
    const floorSection = src.slice(src.indexOf('for (const [fromCol, toCol] of groundRuns(def))'));
    expect(floorSection).not.toMatch(floorLipShape);
  });

  it('a trapdoor paints no rim of its own', () => {
    expect(read('src/traps/FallingPlatformTrap.ts')).not.toMatch(floorLipShape);
  });

  it('a sliding slab paints no rim of its own', () => {
    expect(read('src/traps/MovingPlatformTrap.ts')).not.toMatch(floorLipShape);
  });

  it('the ground tile and the platform slab carry the same lip, so the two materials match', () => {
    const art = read('src/art/drawTiles.ts');
    const lip = "ctx.fillStyle = hexToCss(PALETTE.cyan, 0.85);\n  ctx.fillRect(0, 0, TILE_SIZE, 2);";
    const occurrences = art.split(lip).length - 1;
    expect(occurrences).toBe(2);
  });
});
