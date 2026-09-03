import type { LevelDef } from '@/gameplay/LevelDef';

/**
 * SECTOR 01 — SYSTEM BOOT. Teaches move → jump → exit, then the first honest
 * trap, then progressively combines gaps, spikes and one-way platforms
 * (master-prompt §24: first ten minutes / §66: teach → practice → combine).
 *
 * Platform steps are kept to a 2-row (20px) rise per hop — comfortably under
 * the ~32px jump apex from PHYSICS (config/physics.ts), so every jump in
 * this sector clears with margin rather than relying on frame-perfect input.
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
    platforms: [{ col: 24, row: 20, width: 4 }],
    playerStartCol: 2,
    exitCol: 46,
  },
  {
    id: 'sector-01-level-04',
    name: 'RISE',
    width: 56,
    groundRow: 22,
    gaps: [[16, 17]],
    spikeColumns: [26, 27],
    platforms: [
      { col: 34, row: 20, width: 3 },
      { col: 40, row: 18, width: 3 },
    ],
    playerStartCol: 2,
    exitCol: 52,
  },
  {
    id: 'sector-01-level-05',
    name: 'PRESSURE',
    width: 64,
    groundRow: 22,
    gaps: [
      [12, 13],
      [38, 40],
    ],
    spikeColumns: [20, 21, 22, 48],
    // The platform bridges straight over the spike cluster: an honest
    // alternate route, not a trick (CLAUDE.md #4 — no dishonest difficulty).
    platforms: [{ col: 19, row: 20, width: 5 }],
    playerStartCol: 2,
    exitCol: 60,
  },
  {
    id: 'sector-01-level-06',
    name: 'SECTOR EXIT',
    width: 70,
    groundRow: 22,
    gaps: [
      [14, 15],
      [44, 46],
    ],
    spikeColumns: [24, 25, 56],
    platforms: [
      { col: 30, row: 20, width: 3 },
      { col: 34, row: 18, width: 3 },
    ],
    playerStartCol: 2,
    exitCol: 66,
  },
];
