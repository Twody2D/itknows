import type { TrapDef } from '@/traps/TrapDef';

/**
 * Level format: structured geometry plus optional dynamic traps, not a
 * hand-drawn tile grid or a JSON blob repeating per-tile data (CLAUDE.md
 * §54 — reusable definitions).
 *
 * ONE SCREEN, NO SCROLL. Every level is exactly `LEVEL_WIDTH_TILES` wide and
 * `LEVEL_HEIGHT_TILES` tall, which is exactly what the camera shows on any
 * device. That is the whole point of the format rather than an incidental
 * size limit: the player can see every hazard, every platform and the exit
 * from the spawn point, before moving. It makes CLAUDE.md #4's closing
 * question ("мог ли игрок этого избежать, зная то, что было видно на
 * экране?") structurally true instead of something each level has to be
 * audited for — the level *is* the telegraph, and a trap's own warning
 * phase becomes a second line of defence for moving parts rather than the
 * only thing standing between the player and an unfair death.
 *
 * Difficulty therefore comes from arrangement and precision, never from
 * length. A single jump rises ~3.4 tiles and covers ~5.8 tiles of flat
 * ground (`jumpPhysics.ts`), so the 27-tile height is worth about seven
 * stacked tiers — levels are built upward, which is also what CLAUDE.md #2
 * asks for ("уровни проектируются по высоте").
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
  /** Level width in tiles — always `LEVEL_WIDTH_TILES` (`tests/level-def-sanity.test.ts` enforces it). */
  width: number;
  /** Tile row where the ground surface begins (ground fills to the bottom). */
  groundRow: number;
  /** Inclusive [from, to] tile-column ranges with no ground — pits. */
  gaps: Array<[number, number]>;
  /** Tile columns with a single static spike sitting on the ground surface. */
  spikeColumns: number[];
  /** Floating platforms above the ground. */
  platforms: PlatformDef[];
  /** Player spawn tile column (spawns standing on the ground row). */
  playerStartCol: number;
  /** Exit tile column (occupies exitCol, exitCol+1). */
  exitCol: number;
  /**
   * Surface row the exit stands on — defaults to `groundRow`.
   *
   * What makes a one-screen level a climb rather than a short corridor: put
   * the exit on the top tier and the level's whole question becomes "how do
   * I get up there", which is a question the player can study from the spawn
   * point. The row must be a real standable surface (a platform, or the
   * ground) — `LevelValidator` proves it is, and proves it is reachable.
   */
  exitRow?: number;
  /** Dynamic traps (all 18 non-static-spike types) — optional, empty by default. */
  traps?: TrapDef[];
  /**
   * Target clear time in ms for the level's third star (`gameplay/stars.ts`).
   *
   * Leave it out and the target is derived from the level's own geometry,
   * walked along the route the solver proves passable (`gameplay/parTime.ts`)
   * — which is what every level should normally do, so the target follows the
   * level when the level changes. Set it only where that estimate is wrong
   * about the level's real pace, and only after playing it: the derivation
   * can see distance and height but not, say, a hazard whose window opens
   * once every four seconds on the one ledge worth standing on.
   *
   * It can be set higher or lower, but never below the physical floor for the
   * route — `tests/par-time.test.ts` rejects a target no player could meet.
   */
  starTimeMs?: number;
}

/** Total playfield height in tiles — matches VIRTUAL_HEIGHT / TILE_SIZE exactly. */
export const LEVEL_HEIGHT_TILES = 27;

/** The surface row the exit stands on — `exitRow` when set, the ground otherwise. */
export function exitRowOf(def: LevelDef): number {
  return def.exitRow ?? def.groundRow;
}
