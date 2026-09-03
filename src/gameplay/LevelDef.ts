import type { TrapDef } from '@/traps/TrapDef';
import type { LevelSectionConfig } from './LevelSections';

/**
 * Level format: structured geometry plus optional dynamic traps, not a
 * hand-drawn tile grid or a JSON blob repeating per-tile data (CLAUDE.md
 * §54 — reusable definitions).
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
  /** Tile columns with a single static spike sitting on the ground surface. */
  spikeColumns: number[];
  /** Floating platforms above the ground. */
  platforms: PlatformDef[];
  /** Player spawn tile column (spawns standing on the ground row). */
  playerStartCol: number;
  /** Exit tile column (occupies exitCol, exitCol+1). */
  exitCol: number;
  /** Dynamic traps (all 12 non-static-spike types) — optional, empty by default. */
  traps?: TrapDef[];
  /** Tile columns where crossing (on the ground) moves the death-respawn point forward — optional, empty by default. */
  checkpoints?: number[];
  /** Structural breakdown of the level's shape (intro/challenge/.../final) — optional, informational (see `LevelSections.ts`). */
  sections?: LevelSectionConfig[];
}

/** Total playfield height in tiles — matches VIRTUAL_HEIGHT / TILE_SIZE exactly. */
export const LEVEL_HEIGHT_TILES = 27;
