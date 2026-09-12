import { describe, expect, it } from 'vitest';
import { SECTOR_01_LEVELS } from '@/data/levels/sector01';
import { SECTOR_02_LEVELS } from '@/data/levels/sector02';
import { SECTOR_03_LEVELS } from '@/data/levels/sector03';
import { SECTOR_04_LEVELS } from '@/data/levels/sector04';
import { SECTOR_05_LEVELS } from '@/data/levels/sector05';
import { LEVEL_HEIGHT_TILES, exitRowOf } from '@/gameplay/LevelDef';
import type { LevelDef } from '@/gameplay/LevelDef';
import { MAX_JUMP_RISE_PX } from '@/gameplay/jumpPhysics';
import { LEVEL_WIDTH_TILES, TILE_SIZE } from '@/config/display';

/**
 * Cheap structural sanity checks. This is not the reachability solver
 * (`LevelValidator.ts`, covered by tests/level-validator.test.ts) — it only
 * catches authoring mistakes that would make a level definition nonsensical
 * before physics ever runs.
 */
function isInAnyGap(col: number, gaps: Array<[number, number]>): boolean {
  return gaps.some(([from, to]) => col >= from && col <= to);
}

describe.each([
  ...SECTOR_01_LEVELS,
  ...SECTOR_02_LEVELS,
  ...SECTOR_03_LEVELS,
  ...SECTOR_04_LEVELS,
  ...SECTOR_05_LEVELS,
])('level def: $id', (level: LevelDef) => {
  it('is exactly one screen wide', () => {
    // The camera does not scroll (`GameplayScene.setupCameras`) and its zoom
    // makes the visible world exactly `LEVEL_WIDTH_TILES` across on every
    // viewport. A narrower level would leave void past its edge; a wider one
    // would hide part of itself, which is the one thing the one-screen format
    // exists to prevent.
    expect(level.width).toBe(LEVEL_WIDTH_TILES);
  });

  it('has a ground row within the playfield', () => {
    expect(level.groundRow).toBeGreaterThan(0);
    expect(level.groundRow).toBeLessThan(LEVEL_HEIGHT_TILES);
  });

  it('has gap ranges that are valid and within bounds', () => {
    for (const [from, to] of level.gaps) {
      expect(from).toBeLessThanOrEqual(to);
      expect(from).toBeGreaterThanOrEqual(0);
      expect(to).toBeLessThan(level.width);
    }
  });

  it('spawns the player on solid ground, not in a gap', () => {
    expect(level.playerStartCol).toBeGreaterThanOrEqual(0);
    expect(level.playerStartCol).toBeLessThan(level.width);
    expect(isInAnyGap(level.playerStartCol, level.gaps)).toBe(false);
  });

  it('places both exit columns on one real surface', () => {
    expect(level.exitCol).toBeGreaterThanOrEqual(0);
    expect(level.exitCol + 1).toBeLessThan(level.width);

    const exitRow = exitRowOf(level);
    if (exitRow === level.groundRow) {
      expect(isInAnyGap(level.exitCol, level.gaps)).toBe(false);
      expect(isInAnyGap(level.exitCol + 1, level.gaps)).toBe(false);
      return;
    }

    // An elevated exit needs a single platform under both of its columns —
    // one bridging two platforms with air under half of it is not somewhere
    // the player can stand.
    const carrier = level.platforms.find(
      (p) => p.row === exitRow && p.col <= level.exitCol && p.col + p.width - 1 >= level.exitCol + 1,
    );
    expect(carrier, `no platform at row ${exitRow} spans cols ${level.exitCol}-${level.exitCol + 1}`).toBeDefined();
  });

  it('never places a spike inside a gap', () => {
    for (const col of level.spikeColumns) {
      expect(isInAnyGap(col, level.gaps)).toBe(false);
      expect(col).toBeGreaterThanOrEqual(0);
      expect(col).toBeLessThan(level.width);
    }
  });

  it('keeps platforms within the level bounds and above the ground', () => {
    for (const platform of level.platforms) {
      expect(platform.col).toBeGreaterThanOrEqual(0);
      expect(platform.col + platform.width).toBeLessThanOrEqual(level.width);
      expect(platform.row).toBeLessThan(level.groundRow);
      expect(platform.row).toBeGreaterThanOrEqual(0);
    }
  });

  it('keeps every trap inside the level bounds', () => {
    for (const trap of level.traps ?? []) {
      const cols =
        'col' in trap
          ? [trap.col]
          : 'fromCol' in trap
            ? [trap.fromCol, trap.toCol]
            : 'pivotCol' in trap
              ? [trap.pivotCol]
              : trap.waypoints.map((point) => point.col);
      for (const col of cols) {
        expect(col, `${trap.id} sits outside the level`).toBeGreaterThanOrEqual(0);
        expect(col, `${trap.id} sits outside the level`).toBeLessThan(level.width);
      }
    }
  });

  it('resolves every trigger targetId to a trap id defined in the same level', () => {
    const traps = level.traps ?? [];
    const ids = new Set(traps.map((t) => t.id));
    for (const trap of traps) {
      if (trap.type === 'trigger') {
        expect(ids.has(trap.targetId)).toBe(true);
      }
    }
  });

  it('has unique trap ids within the level', () => {
    const traps = level.traps ?? [];
    const ids = traps.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('reaches every elevated platform/trap row from the ground via a chain of single-jump-height rises', () => {
    // A narrower, vertical-only complement to LevelValidator (which proves a
    // path from spawn to exit exists, but not that every individual platform
    // is reachable). This exists because of a real bug: an elevated bonus
    // route placed 4 tiles above ground turned out to be physically
    // unreachable — MAX_JUMP_RISE_PX caps a single jump's rise at ~34.7px,
    // and 4 tiles is 40px. Now that levels are one screen and built upward,
    // a mis-stacked tier is the most likely authoring mistake there is.
    const maxRiseTiles = MAX_JUMP_RISE_PX / TILE_SIZE;

    const rows = new Set<number>([level.groundRow, exitRowOf(level)]);
    for (const platform of level.platforms) rows.add(platform.row);
    for (const trap of level.traps ?? []) {
      if (trap.type === 'moving-platform') {
        rows.add(trap.fromRow);
        rows.add(trap.toRow);
      } else if (
        trap.type === 'falling-platform' ||
        trap.type === 'disappearing-platform' ||
        trap.type === 'fake-platform'
      ) {
        rows.add(trap.row);
      }
    }

    const reached = new Set<number>([level.groundRow]);
    let changed = true;
    while (changed) {
      changed = false;
      for (const row of rows) {
        if (reached.has(row)) continue;
        for (const from of reached) {
          if (from - row <= maxRiseTiles) {
            reached.add(row);
            changed = true;
            break;
          }
        }
      }
    }

    const unreachable = [...rows].filter((r) => !reached.has(r));
    expect(unreachable, `rows unreachable from groundRow ${level.groundRow}: ${unreachable.join(', ')}`).toEqual([]);
  });
});
