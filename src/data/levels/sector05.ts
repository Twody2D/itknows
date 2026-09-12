import type { LevelDef } from '@/gameplay/LevelDef';

/**
 * SECTOR 05 — SYSTEM CORE. The campaign's closing argument, and the only
 * sector that attacks the habit the previous four built.
 *
 * Sectors 02 and 03 taught patience: find the safe tile, watch the cycle,
 * then commit. Sector 04 taught the opposite for crumbling ground. This one
 * takes the safe tile away — the pursuer makes standing still cost
 * something, so every wait is now a trade rather than a free action. Nothing
 * here is faster than the player (`speedFactor` below 1, CLAUDE.md #13), so
 * the pressure is always survivable by moving well; it is never a race that
 * can be lost at the spawn point.
 *
 * ONE FAKE EXIT IN THE WHOLE SECTOR (`sector-05-level-03`), which is the
 * cap CLAUDE.md #4.7 sets. It is on the obvious path, at ground level, with
 * the real exit plainly visible above it — its core does not glow, which is
 * the distinguishing mark the same rule requires, and reaching it costs a
 * walk back rather than a life.
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
    playerStartCol: 4,
    exitCol: 43,
    traps: [
      // Slower than the player by a wide margin, and it starts three
      // columns behind them: this is a clock, not a predator. Every spike
      // pair and the pit are things the player already knows how to solve —
      // what is new is that dithering in front of them now has a price.
      { type: 'pursuer', id: 'pursuer-01', col: 1, row: 21, speedFactor: 0.6 },
      { type: 'moving-spike', id: 'mspike-01', fromCol: 34, fromRow: 19, toCol: 40, toRow: 19, travelMs: 2400 },
    ],
  },
  {
    id: 'sector-05-level-02',
    name: 'CIRCUIT',
    width: 48,
    groundRow: 22,
    gaps: [],
    spikeColumns: [],
    platforms: [
      { col: 12, row: 19, width: 5 },
      { col: 20, row: 16, width: 5 },
      { col: 28, row: 13, width: 6 },
    ],
    playerStartCol: 2,
    exitCol: 30,
    exitRow: 13,
    traps: [
      // A one-way circuit, never reversing — which is exactly what makes it
      // harder to read than a patrol. A ping-pong teaches "it comes straight
      // back"; this comes back around the other side, so the safe moment has
      // to be counted rather than felt.
      {
        type: 'loop-spike',
        id: 'loop-01',
        waypoints: [
          { col: 14, row: 17 },
          { col: 20, row: 17 },
          { col: 20, row: 20 },
          { col: 14, row: 20 },
        ],
        travelMs: 1150,
      },
      {
        type: 'loop-spike',
        id: 'loop-02',
        waypoints: [
          { col: 25, row: 14 },
          { col: 31, row: 14 },
          { col: 31, row: 17 },
          { col: 25, row: 17 },
        ],
        travelMs: 1000,
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
      // Straight ahead on the ground, where every exit in the campaign so
      // far has been. The real one is above and to the right, lit, and
      // visible from the spawn — the level is a question about whether the
      // player has been reading or pattern-matching.
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
      // The pursuer returns against the sector's timed hazards rather than
      // against plain geometry: every laser here is a wait, and the wait is
      // now being charged for. The ground between them is still wide enough
      // to take that wait — just not twice.
      { type: 'pursuer', id: 'pursuer-01', col: 1, row: 21, speedFactor: 0.55 },
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
    // The campaign's tallest climb: six tiers from the ground to row 4, the
    // full height of the screen, with the exit at the top. Every tier is a
    // hazard the player has already met, none of them new — the finale is
    // about doing all of it in one run, not about one last surprise.
    // The row-10 tier is deliberately short and out of reach of the tier
    // below it: `dp-01` is the step that bridges them, so the one crumbling
    // platform in the level is load-bearing rather than decorative. It sat
    // flush against this ledge in the first draft, which made it a wider
    // ledge and nothing more.
    platforms: [
      { col: 24, row: 19, width: 5 },
      { col: 32, row: 16, width: 5 },
      { col: 24, row: 13, width: 5 },
      { col: 33, row: 10, width: 4 },
      { col: 26, row: 7, width: 5 },
      { col: 32, row: 4, width: 6 },
    ],
    playerStartCol: 2,
    exitCol: 34,
    exitRow: 4,
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
