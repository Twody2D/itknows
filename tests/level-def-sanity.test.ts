import { describe, expect, it } from 'vitest';
import { SECTOR_01_LEVELS } from '@/data/levels/sector01';
import { LEVEL_HEIGHT_TILES } from '@/gameplay/LevelDef';
import type { LevelDef } from '@/gameplay/LevelDef';

/**
 * Cheap structural sanity checks. This is not the reachability solver
 * (CLAUDE.md #4.3 / Phase 2's LevelValidator) — it only catches authoring
 * mistakes that would make a level definition nonsensical before physics
 * ever runs.
 */
function isInAnyGap(col: number, gaps: Array<[number, number]>): boolean {
  return gaps.some(([from, to]) => col >= from && col <= to);
}

describe.each(SECTOR_01_LEVELS)('level def: $id', (level: LevelDef) => {
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

  it('places the exit on solid ground, not in a gap', () => {
    expect(level.exitCol).toBeGreaterThanOrEqual(0);
    expect(level.exitCol + 1).toBeLessThan(level.width);
    expect(isInAnyGap(level.exitCol, level.gaps)).toBe(false);
    expect(isInAnyGap(level.exitCol + 1, level.gaps)).toBe(false);
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
    }
  });
});
