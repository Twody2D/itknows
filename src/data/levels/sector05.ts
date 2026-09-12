import type { LevelDef } from '@/gameplay/LevelDef';

/**
 * SECTOR 05 — SYSTEM CORE. Waiting now costs something.
 *
 * The campaign's closing argument, and the only sector that attacks the
 * habit the previous four built. Sectors 03 and 04 taught patience: find the
 * safe tile, read the cycle, then commit. This one takes the safe tile away
 * — the pursuer turns every wait into a trade instead of a free action, and
 * suddenly every beam the player learned to sit and watch is expensive.
 *
 *   01 HUNTED      — something is behind you
 *   02 CHASE       — and the floor is moving too
 *   03 MIRROR      — the exit you expected is not the exit
 *   04 GAUNTLET    — four families, one screen
 *   05 PRESSURE    — beams to wait for, with the wait charged for
 *   06 SYSTEM CORE — the full height of the screen
 *
 * Nothing here is faster than the player (`speedFactor` below 1, CLAUDE.md
 * #13), so the pressure is always survivable by moving well; it is never a
 * race that was lost at the spawn point.
 *
 * ONE FAKE EXIT IN THE WHOLE SECTOR (`sector-05-level-03`), the cap
 * CLAUDE.md #4.7 sets. It stands on the obvious path at ground level with
 * the real exit plainly visible above it, its core unlit — the
 * distinguishing mark the same rule requires — and reaching it costs a walk
 * back rather than a life.
 */
export const SECTOR_05_LEVELS: LevelDef[] = [
  {
    id: 'sector-05-level-01',
    name: 'HUNTED',
    width: 48,
    groundRow: 22,
    gaps: [[20, 23]],
    spikeColumns: [13, 14, 30, 31],
    platforms: [],
    // Seven columns clear of the drone, not three. Together with its own
    // two-second hold that is the daylight the level opens with — long
    // enough to look at the screen before running, which is the whole
    // difference between a chase and an ambush from off-camera.
    playerStartCol: 7,
    exitCol: 43,
    traps: [
      // Slower than the player by a wide margin and starting three columns
      // behind them: a clock, not a predator. Every spike pair and the pit
      // are things the player already knows how to solve — what is new is
      // that hesitating in front of them now has a price.
      { type: 'pursuer', id: 'pursuer-01', col: 0, row: 21, speedFactor: 0.6 },
      { type: 'moving-spike', id: 'mspike-01', fromCol: 34, fromRow: 19, toCol: 40, toRow: 19, travelMs: 2400 },
    ],
  },
  {
    id: 'sector-05-level-02',
    name: 'CHASE',
    width: 48,
    groundRow: 22,
    // Sector 01's moving hole, with something behind you. On its own the
    // sliding floor is a patience puzzle: wait for the slab, step on,
    // ride. Here waiting is the one thing that is not free, so the crossing
    // has to be taken at the moment it opens rather than the moment it is
    // comfortable.
    gaps: [[16, 33]],
    spikeColumns: [9, 10],
    platforms: [],
    playerStartCol: 4,
    exitCol: 43,
    traps: [
      { type: 'pursuer', id: 'pursuer-01', col: 0, row: 21, speedFactor: 0.55 },
      {
        type: 'moving-platform',
        id: 'movp-01',
        fromCol: 16,
        fromRow: 22,
        toCol: 21,
        toRow: 22,
        width: 13,
        travelMs: 2400,
      },
    ],
  },
  {
    id: 'sector-05-level-03',
    name: 'MIRROR',
    width: 48,
    groundRow: 22,
    gaps: [],
    spikeColumns: [16, 17],
    platforms: [
      { col: 34, row: 19, width: 5 },
      { col: 26, row: 16, width: 5 },
      { col: 34, row: 13, width: 6 },
    ],
    playerStartCol: 2,
    exitCol: 36,
    exitRow: 13,
    traps: [
      // Straight ahead on the ground, where every exit for four sectors has
      // been. The real one is above and to the right, lit, and visible from
      // the spawn — the level is a question about whether the player has
      // been reading or pattern-matching.
      { type: 'fake-exit', id: 'fake-exit-01', col: 27, row: 22 },
      { type: 'laser', id: 'laser-01', col: 31, topRow: 17, bottomRow: 21 },
      { type: 'moving-spike', id: 'mspike-01', fromCol: 27, fromRow: 15, toCol: 32, toRow: 15, travelMs: 1700 },
    ],
  },
  {
    id: 'sector-05-level-04',
    name: 'GAUNTLET',
    width: 48,
    groundRow: 22,
    gaps: [[22, 26]],
    spikeColumns: [11, 12],
    platforms: [
      { col: 30, row: 19, width: 5 },
      { col: 22, row: 16, width: 5 },
      { col: 30, row: 13, width: 5 },
      { col: 38, row: 10, width: 6 },
    ],
    playerStartCol: 2,
    exitCol: 40,
    exitRow: 10,
    traps: [
      { type: 'spike-bank', id: 'sbank-01', col: 16, width: 3, hiddenRow: 23, lethalRow: 21 },
      { type: 'laser', id: 'laser-01', col: 28, topRow: 17, bottomRow: 21, initialIdleMs: 700 },
      { type: 'orbit-spike', id: 'orbit-01', pivotCol: 28, pivotRow: 15, radiusTiles: 1.75, periodMs: 1900 },
      { type: 'disappearing-platform', id: 'dp-01', col: 35, row: 16, width: 3 },
    ],
  },
  {
    id: 'sector-05-level-05',
    name: 'PRESSURE',
    width: 48,
    groundRow: 22,
    gaps: [[26, 30]],
    spikeColumns: [12, 13, 20, 21],
    platforms: [{ col: 34, row: 19, width: 5 }],
    playerStartCol: 4,
    exitCol: 43,
    traps: [
      // The pursuer against the sector's timed hazards rather than against
      // plain geometry: every beam here is a wait, and the wait is now
      // being charged for. The ground between them is still wide enough to
      // take that wait — just not twice.
      { type: 'pursuer', id: 'pursuer-01', col: 0, row: 21, speedFactor: 0.55 },
      { type: 'laser', id: 'laser-01', col: 17, topRow: 16, bottomRow: 21 },
      { type: 'laser', id: 'laser-02', col: 24, topRow: 16, bottomRow: 21, initialIdleMs: 800 },
      { type: 'electric-floor', id: 'ef-01', col: 36, width: 5, row: 22 },
    ],
  },
  {
    id: 'sector-05-level-06',
    name: 'SYSTEM CORE',
    width: 48,
    groundRow: 22,
    gaps: [[17, 21]],
    spikeColumns: [9, 10],
    // The campaign's tallest climb: six tiers from the ground to row 5, the
    // full height of the screen, with the exit at the top. Every hazard on
    // it has been met before and none of them is new — the finale is about
    // doing all of it in one run, not about one last surprise. The row-10
    // tier is short and out of reach of the one below on purpose, so the
    // single crumbling ledge in the level is load-bearing rather than
    // decorative.
    platforms: [
      { col: 24, row: 19, width: 5 },
      { col: 32, row: 16, width: 5 },
      { col: 24, row: 13, width: 5 },
      { col: 33, row: 10, width: 4 },
      { col: 26, row: 7, width: 5 },
      // Row 5, not row 4. The exit door is drawn 50px tall from the surface
      // it stands on, so a row-4 landing pushed its top 10px off the screen
      // — the campaign's last door was the one door you could not see all
      // of. This is still the highest tier in the game.
      { col: 32, row: 5, width: 6 },
    ],
    playerStartCol: 2,
    exitCol: 34,
    exitRow: 5,
    traps: [
      { type: 'spike-bank', id: 'sbank-01', col: 13, width: 3, hiddenRow: 23, lethalRow: 21 },
      {
        type: 'moving-platform',
        id: 'movp-01',
        fromCol: 17,
        fromRow: 19,
        toCol: 21,
        toRow: 19,
        width: 3,
        travelMs: 2200,
      },
      { type: 'laser', id: 'laser-01', col: 30, topRow: 17, bottomRow: 21 },
      { type: 'orbit-spike', id: 'orbit-01', pivotCol: 30, pivotRow: 14, radiusTiles: 1.75, periodMs: 1800 },
      { type: 'disappearing-platform', id: 'dp-01', col: 28, row: 10, width: 3 },
      { type: 'swinging-spike', id: 'swing-01', pivotCol: 28, pivotRow: 3, lengthTiles: 3, maxAngleDeg: 44, periodMs: 1600 },
    ],
  },
];
