import type { LevelDef } from '@/gameplay/LevelDef';

/**
 * SECTOR 03 — INDUSTRIAL CORE. Machinery that runs whether or not anyone is
 * watching: pistons in the floor, presses in the ceiling, walls that slide
 * shut, and floor plates that go live on a beat.
 *
 * Sector 02's beams were thin and you stepped through them. These fill whole
 * spans, so there is no threading — only standing clear and then committing.
 * Every hazard here is dimly visible at idle, which is the tell the player
 * learns to read: `spike-bank` and `spike-wall` are deliberately not the
 * ambush variant of `moving-spike` (see `TrapDef.ts`), because a machine
 * that hid itself would make a wide span unreadable rather than hard.
 *
 * NOTHING CYCLES IN SYNC. Every bank and wall is given its own
 * `initialIdleMs`, so no level can be solved by learning one rhythm and
 * holding it — each obstacle is read on approach. That is the difference
 * between a level that is demanding and a level that is a memory test.
 */

/** The sector's honest machine cycle: half a second of visible warning, twice `MIN_WARNING_MS`. */
const MACHINE_TIMING = { idleMs: 900, warningMs: 500, activeMs: 300, cooldownMs: 250 } as const;

export const SECTOR_03_LEVELS: LevelDef[] = [
  {
    id: 'sector-03-level-01',
    name: 'PISTON ROW',
    width: 48,
    groundRow: 22,
    gaps: [],
    spikeColumns: [8, 9],
    platforms: [],
    playerStartCol: 2,
    exitCol: 43,
    traps: [
      // Three pistons with four clear columns of standing room between
      // them. Hidden inside the ground fill at row 23, lethal at row 21 —
      // the row the player actually walks through, so a piston that is up
      // is a wall as well as a hazard.
      { type: 'spike-bank', id: 'sbank-01', col: 14, width: 3, hiddenRow: 23, lethalRow: 21, timing: MACHINE_TIMING },
      {
        type: 'spike-bank',
        id: 'sbank-02',
        col: 22,
        width: 3,
        hiddenRow: 23,
        lethalRow: 21,
        timing: MACHINE_TIMING,
        initialIdleMs: 700,
      },
      {
        type: 'spike-bank',
        id: 'sbank-03',
        col: 30,
        width: 3,
        hiddenRow: 23,
        lethalRow: 21,
        timing: MACHINE_TIMING,
        initialIdleMs: 1400,
      },
    ],
  },
  {
    id: 'sector-03-level-02',
    name: 'PRESS',
    width: 48,
    groundRow: 22,
    gaps: [],
    spikeColumns: [],
    platforms: [
      { col: 10, row: 19, width: 5 },
      { col: 18, row: 16, width: 5 },
      { col: 26, row: 13, width: 5 },
      { col: 34, row: 10, width: 6 },
    ],
    playerStartCol: 2,
    exitCol: 36,
    exitRow: 10,
    traps: [
      // The same machine hung upside down: `hiddenRow` above `lethalRow`
      // makes a bank slam *down* instead of punching up (`TrapDef.ts`), and
      // each one closes on the tier the climb has to pause on. The landing
      // itself is safe; staying on it is not.
      { type: 'spike-bank', id: 'sbank-01', col: 19, width: 3, hiddenRow: 12, lethalRow: 15, timing: MACHINE_TIMING },
      {
        type: 'spike-bank',
        id: 'sbank-02',
        col: 27,
        width: 3,
        hiddenRow: 9,
        lethalRow: 12,
        timing: MACHINE_TIMING,
        initialIdleMs: 850,
      },
    ],
  },
  {
    id: 'sector-03-level-03',
    name: 'CURRENT',
    width: 48,
    groundRow: 22,
    gaps: [],
    spikeColumns: [22, 23],
    platforms: [],
    playerStartCol: 2,
    exitCol: 43,
    traps: [
      // Two live floor plates with a spike pair marooned between them: the
      // safe ground in the middle is real but small, so crossing is two
      // decisions rather than one long dash.
      { type: 'electric-floor', id: 'ef-01', col: 13, width: 6, row: 22, timing: MACHINE_TIMING },
      {
        type: 'electric-floor',
        id: 'ef-02',
        col: 27,
        width: 6,
        row: 22,
        timing: { ...MACHINE_TIMING, idleMs: 1100 },
      },
      { type: 'laser', id: 'laser-01', col: 38, topRow: 16, bottomRow: 21 },
    ],
  },
  {
    id: 'sector-03-level-04',
    name: 'SQUEEZE',
    width: 48,
    groundRow: 22,
    gaps: [],
    spikeColumns: [],
    platforms: [
      { col: 28, row: 19, width: 5 },
      { col: 36, row: 16, width: 6 },
    ],
    playerStartCol: 2,
    exitCol: 38,
    exitRow: 16,
    traps: [
      // Walls grow sideways out of a fixed edge rather than up or down, so
      // they cannot be jumped over the way a piston can — the only answer
      // is to not be in the span. They close toward each other from
      // opposite sides with a gap of clear ground between, which is the
      // level's one safe place to stand and read them both.
      {
        type: 'spike-wall',
        id: 'swall-01',
        col: 12,
        topRow: 19,
        bottomRow: 21,
        extendTiles: 4,
        timing: MACHINE_TIMING,
      },
      {
        type: 'spike-wall',
        id: 'swall-02',
        col: 26,
        topRow: 19,
        bottomRow: 21,
        extendTiles: 4,
        fromRight: true,
        timing: MACHINE_TIMING,
        initialIdleMs: 950,
      },
    ],
  },
  {
    id: 'sector-03-level-05',
    name: 'MACHINE',
    width: 48,
    groundRow: 22,
    gaps: [[19, 22]],
    spikeColumns: [10, 11],
    platforms: [
      { col: 26, row: 19, width: 5 },
      { col: 34, row: 16, width: 5 },
      { col: 26, row: 13, width: 6 },
    ],
    playerStartCol: 2,
    exitCol: 28,
    exitRow: 13,
    traps: [
      { type: 'spike-bank', id: 'sbank-01', col: 15, width: 3, hiddenRow: 23, lethalRow: 21, timing: MACHINE_TIMING },
      // The piston stands immediately before the pit, so it decides *when*
      // the jump happens and the pit decides whether it lands. Two hazards
      // that have to be solved as one move, from ground that is safe to
      // wait on for as long as the player likes.
      {
        type: 'spike-bank',
        id: 'sbank-02',
        col: 28,
        width: 3,
        hiddenRow: 17,
        lethalRow: 18,
        timing: MACHINE_TIMING,
        initialIdleMs: 600,
      },
      {
        type: 'spike-wall',
        id: 'swall-01',
        col: 38,
        topRow: 14,
        bottomRow: 15,
        extendTiles: 4,
        fromRight: true,
        timing: MACHINE_TIMING,
        initialIdleMs: 1200,
      },
    ],
  },
  {
    id: 'sector-03-level-06',
    name: 'CORE',
    width: 48,
    groundRow: 22,
    gaps: [[25, 29]],
    spikeColumns: [17, 18],
    platforms: [
      { col: 32, row: 19, width: 5 },
      { col: 24, row: 16, width: 5 },
      { col: 32, row: 13, width: 5 },
      { col: 24, row: 10, width: 6 },
    ],
    playerStartCol: 2,
    exitCol: 26,
    exitRow: 10,
    traps: [
      { type: 'electric-floor', id: 'ef-01', col: 8, width: 5, row: 22, timing: MACHINE_TIMING },
      {
        type: 'spike-bank',
        id: 'sbank-01',
        col: 21,
        width: 3,
        hiddenRow: 23,
        lethalRow: 21,
        timing: MACHINE_TIMING,
        initialIdleMs: 500,
      },
      // The zig-zag climb crosses back over itself twice, and a press waits
      // on each turn. The sector's whole vocabulary asked at once, with the
      // exit above all of it.
      {
        type: 'spike-bank',
        id: 'sbank-02',
        col: 33,
        width: 3,
        hiddenRow: 15,
        lethalRow: 18,
        timing: MACHINE_TIMING,
        initialIdleMs: 1000,
      },
      {
        type: 'spike-wall',
        id: 'swall-01',
        col: 29,
        topRow: 14,
        bottomRow: 15,
        extendTiles: 3,
        timing: MACHINE_TIMING,
        initialIdleMs: 1600,
      },
    ],
  },
];
