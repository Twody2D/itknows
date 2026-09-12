import { describe, expect, it } from 'vitest';
import { validateLevel } from '@/gameplay/LevelValidator';
import { SECTOR_01_LEVELS } from '@/data/levels/sector01';
import { SECTOR_02_LEVELS } from '@/data/levels/sector02';
import { SECTOR_03_LEVELS } from '@/data/levels/sector03';
import { SECTOR_04_LEVELS } from '@/data/levels/sector04';
import { SECTOR_05_LEVELS } from '@/data/levels/sector05';
import type { LevelDef } from '@/gameplay/LevelDef';

describe.each([
  ...SECTOR_01_LEVELS,
  ...SECTOR_02_LEVELS,
  ...SECTOR_03_LEVELS,
  ...SECTOR_04_LEVELS,
  ...SECTOR_05_LEVELS,
])('validateLevel: $id', (level: LevelDef) => {
  it('has a jump-reachable path from spawn to exit', () => {
    const result = validateLevel(level);
    expect(result.valid, result.reason).toBe(true);
  });
});

describe('validateLevel — rejects genuinely impossible geometry', () => {
  const base: LevelDef = {
    id: 'test-impossible',
    name: 'TEST',
    width: 40,
    groundRow: 22,
    gaps: [],
    spikeColumns: [],
    platforms: [],
    playerStartCol: 2,
    exitCol: 36,
  };

  it('never counts a falling floor as footing, armed or not', () => {
    // A falling platform leaves and does not come back, so a level that
    // needs one to get across is a level that can strand the player
    // (CLAUDE.md #4.4). The solver has to answer "can this be crossed with
    // every falling floor already gone", and the only honest answer for a
    // 100px pit bridged solely by falling stones is no.
    const pit: [number, number] = [14, 23];
    const bridged: LevelDef = {
      ...base,
      gaps: [pit],
      traps: [
        { type: 'falling-platform', id: 'flp-01', col: 14, row: 22, width: 5 },
        { type: 'falling-platform', id: 'flp-02', col: 19, row: 22, width: 5, armed: true },
      ],
    };
    expect(validateLevel(bridged).valid).toBe(false);

    // The same pit with one real slab in the middle of it is fine: two
    // 40px hops against a 57.9px jump.
    const withSlab: LevelDef = { ...bridged, platforms: [{ col: 18, row: 22, width: 2 }] };
    expect(validateLevel(withSlab).valid, validateLevel(withSlab).reason).toBe(true);
  });

  it('rejects a gap far wider than any jump can cross', () => {
    const level: LevelDef = { ...base, gaps: [[10, 30]] }; // 210px gap
    const result = validateLevel(level);
    expect(result.valid).toBe(false);
  });

  it('rejects a spawn column sitting inside a gap', () => {
    const level: LevelDef = { ...base, gaps: [[0, 5]] };
    const result = validateLevel(level);
    expect(result.valid).toBe(false);
    expect(result.reason).toMatch(/start column/);
  });

  it('rejects an exit column sitting inside a gap', () => {
    const level: LevelDef = { ...base, gaps: [[35, 39]] };
    const result = validateLevel(level);
    expect(result.valid).toBe(false);
    expect(result.reason).toMatch(/exit column/);
  });

  it('accepts a level with no gaps at all (sanity check the checker is not just failing everything)', () => {
    const result = validateLevel(base);
    expect(result.valid).toBe(true);
  });
});
