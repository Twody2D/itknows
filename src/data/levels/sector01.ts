import type { LevelDef } from '@/gameplay/LevelDef';

/**
 * SECTOR 01 — SYSTEM BOOT. Teaches move → jump → exit, then the first honest
 * trap, then a combination of both (master-prompt §24: first ten minutes).
 */
export const SECTOR_01_LEVELS: LevelDef[] = [
  {
    id: 'sector-01-level-01',
    name: 'BOOT',
    width: 40,
    groundRow: 22,
    gaps: [[18, 20]],
    spikeColumns: [],
    platforms: [],
    playerStartCol: 2,
    exitCol: 36,
  },
  {
    id: 'sector-01-level-02',
    name: 'FIRST WARNING',
    width: 44,
    groundRow: 22,
    gaps: [],
    spikeColumns: [22, 23, 24],
    platforms: [],
    playerStartCol: 2,
    exitCol: 40,
  },
  {
    id: 'sector-01-level-03',
    name: 'GAP AND SPIKE',
    width: 50,
    groundRow: 22,
    gaps: [[14, 16]],
    spikeColumns: [30, 31],
    platforms: [{ col: 24, row: 18, width: 4 }],
    playerStartCol: 2,
    exitCol: 46,
  },
];
