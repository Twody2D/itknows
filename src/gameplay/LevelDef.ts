/**
 * Vertical-slice level format: structured geometry, not a hand-drawn tile
 * grid. Phase 2 replaces this with the full data-driven LevelFactory /
 * variation system (CLAUDE.md #Phase 2) — this stays intentionally small.
 */
export interface PlatformDef {
  /** Tile column of the platform's left edge. */
  col: number;
  /** Tile row the platform surface sits on. */
  row: number;
  /** Width in tiles. */
  width: number;
}

export interface LevelDef {
  id: string;
  name: string;
  /** Level width in tiles. */
  width: number;
  /** Tile row where the ground surface begins (ground fills to the bottom). */
  groundRow: number;
  /** Inclusive [from, to] tile-column ranges with no ground — pits. */
  gaps: Array<[number, number]>;
  /** Tile columns with a single spike sitting on the ground surface. */
  spikeColumns: number[];
  /** Floating platforms above the ground. */
  platforms: PlatformDef[];
  /** Player spawn tile column (spawns standing on the ground row). */
  playerStartCol: number;
  /** Exit tile column (occupies exitCol, exitCol+1). */
  exitCol: number;
}

/** Total playfield height in tiles — matches VIRTUAL_HEIGHT / TILE_SIZE exactly. */
export const LEVEL_HEIGHT_TILES = 27;
