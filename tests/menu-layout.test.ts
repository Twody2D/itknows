import { describe, expect, it } from 'vitest';
import { MENU_GRID_RIGHT, MENU_LAYOUT, MENU_TILES, systemLineWidth, type MenuTileKey } from '@/config/menuLayout';
import { MAX_VIRTUAL_WIDTH, MIN_VIRTUAL_WIDTH, VIRTUAL_HEIGHT } from '@/config/display';
import { MENU_LINES_FOR_TEST } from '@/data/dialogues/menu';

/**
 * The design brief justified this layout partly on it being width-proof —
 * every control inside the 480px safe zone, so 480..540 changes only the
 * atmosphere on the right. That guarantee is easy to break with a one-line
 * nudge and impossible to spot by eye at a single window size, so it's
 * asserted here rather than re-checked by hand.
 */

type Box = { x: number; y: number; w: number; h: number };

const tiles = Object.entries(MENU_TILES) as Array<[MenuTileKey, Box]>;

/** The press nudge and the 2px/4px "sole" both extend a tile below its own box — the safe zone has to hold those too. */
const SOLE_AND_PRESS = 6;

describe('main menu layout', () => {
  it.each(tiles)('%s sits entirely inside the safe zone', (_key, box) => {
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.y).toBeGreaterThanOrEqual(0);
    expect(box.x + box.w).toBeLessThanOrEqual(MIN_VIRTUAL_WIDTH);
    expect(box.y + box.h + SOLE_AND_PRESS).toBeLessThanOrEqual(VIRTUAL_HEIGHT);
  });

  it('no two controls overlap', () => {
    for (let i = 0; i < tiles.length; i++) {
      for (let j = i + 1; j < tiles.length; j++) {
        const [aKey, a] = tiles[i] as [MenuTileKey, Box];
        const [bKey, b] = tiles[j] as [MenuTileKey, Box];
        const overlaps = a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
        expect(overlaps, `${aKey} overlaps ${bKey}`).toBe(false);
      }
    }
  });

  it('PLAY is decisively the largest control', () => {
    const play = MENU_TILES.play.w * MENU_TILES.play.h;
    const others = tiles.filter(([key]) => key !== 'play').map(([, box]) => box.w * box.h);
    // The brief's claim is ~4.2x the area of a secondary button — the reason
    // a child finds the main action without reading anything. Guard the
    // hierarchy, not the exact ratio.
    expect(play / Math.max(...others)).toBeGreaterThan(2);
  });

  it('the showcase panel does not reach into the command column', () => {
    const panelRight = MENU_LAYOUT.showcase.x + MENU_LAYOUT.showcase.w;
    const columnLeft = Math.min(MENU_TILES.play.x, MENU_TILES.levels.x, MENU_TILES.help.x);
    expect(panelRight).toBeLessThan(columnLeft);
  });

  it('controls inside the showcase stay within the panel', () => {
    const panel = MENU_LAYOUT.showcase;
    const skin = MENU_TILES.changeSkin;
    expect(skin.x).toBeGreaterThanOrEqual(panel.x);
    expect(skin.x + skin.w).toBeLessThanOrEqual(panel.x + panel.w);
  });

  it('width-gated decoration declares a width it actually needs', () => {
    // Both are right-anchored, so "needs" means: at the threshold it
    // declares, it fits beside the command grid rather than on top of it.
    const rack = MENU_LAYOUT.serverRack;
    expect(rack.minWidth).toBeGreaterThanOrEqual(MENU_GRID_RIGHT + rack.rightInset + rack.w);

    const line = MENU_LAYOUT.systemLine;
    expect(line.minWidth).toBeGreaterThanOrEqual(MENU_GRID_RIGHT + line.rightInset + line.minW);
  });

  it('every width-gated decoration is reachable at the widest supported canvas', () => {
    // THE CHECK THAT CAUGHT THE 620 -> 540 CAP. Both of these were placed
    // against the design's 620 px canvas — the rack at a fixed `x: 492`
    // behind a 590 px gate, the line behind a 560 px one — so narrowing the
    // canvas to satisfy Yandex's 2:1 desktop limit made both unreachable at
    // every width the game can actually run at: art that ships and never
    // draws. A decoration that no supported canvas can show is dead code
    // (CLAUDE.md #12), not a decoration.
    expect(MENU_LAYOUT.serverRack.minWidth).toBeLessThanOrEqual(MAX_VIRTUAL_WIDTH);
    expect(MENU_LAYOUT.systemLine.minWidth).toBeLessThanOrEqual(MAX_VIRTUAL_WIDTH);
    expect(systemLineWidth(MAX_VIRTUAL_WIDTH)).toBeGreaterThan(0);
  });

  it('the server rack never covers a control at any supported width', () => {
    const rack = MENU_LAYOUT.serverRack;
    for (let width = rack.minWidth; width <= MAX_VIRTUAL_WIDTH; width++) {
      expect(width - rack.rightInset - rack.w, `overlaps the grid at width ${width}`).toBeGreaterThanOrEqual(
        MENU_GRID_RIGHT,
      );
    }
  });

  it('the SYSTEM line never covers a control at any supported width', () => {
    // It's right-anchored and vertically level with the bottom row of the
    // grid, so this is the one thing in the layout that a wider canvas does
    // NOT automatically make safe — the check has to sweep the whole range.
    const line = MENU_LAYOUT.systemLine;
    for (let width = MIN_VIRTUAL_WIDTH; width <= MAX_VIRTUAL_WIDTH; width++) {
      const w = systemLineWidth(width);
      if (w === 0) continue;
      const leftEdge = width - line.rightInset - w;
      expect(leftEdge, `overlaps the grid at width ${width}`).toBeGreaterThanOrEqual(MENU_GRID_RIGHT);
      expect(w, `unreadably narrow at width ${width}`).toBeGreaterThanOrEqual(line.minW);
      expect(w).toBeLessThanOrEqual(line.maxW);
    }
  });

});

describe('SYSTEM menu lines', () => {
  const kinds = Object.keys(MENU_LINES_FOR_TEST) as Array<keyof typeof MENU_LINES_FOR_TEST>;

  it('every kind has at least two lines so the shuffle bag can avoid repeats', () => {
    for (const kind of kinds) expect(MENU_LINES_FOR_TEST[kind].length).toBeGreaterThanOrEqual(2);
  });

  it('has globally unique line ids', () => {
    const ids = kinds.flatMap((kind) => MENU_LINES_FOR_TEST[kind].map((line) => line.id));
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('every line is localized in both languages', () => {
    for (const kind of kinds) {
      for (const line of MENU_LINES_FOR_TEST[kind]) {
        expect(line.ru.length).toBeGreaterThan(0);
        expect(line.en.length).toBeGreaterThan(0);
      }
    }
  });
});
