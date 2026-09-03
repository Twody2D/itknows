import { describe, expect, it } from 'vitest';
import { validateLevel } from '@/gameplay/LevelValidator';
import { SECTOR_01_LEVELS } from '@/data/levels/sector01';
import { SECTOR_02_LEVELS } from '@/data/levels/sector02';
import { SECTOR_03_LEVELS } from '@/data/levels/sector03';
import type { LevelDef } from '@/gameplay/LevelDef';

describe.each([...SECTOR_01_LEVELS, ...SECTOR_02_LEVELS, ...SECTOR_03_LEVELS])('validateLevel: $id', (level: LevelDef) => {
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
