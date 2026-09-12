import type { LevelDef } from '@/gameplay/LevelDef';

/**
 * SECTOR 04 — DATA DISTRICT. The sector where the floor is the hazard.
 * Platforms crumble under the player, drop away, or were never solid at
 * all, and the two spike types here move on curves rather than lines.
 *
 * Everything before this sector could be solved by standing still and
 * waiting for the right moment. Here standing still is what kills you: a
 * crumbling tier is a clock that starts when you land on it. The lesson is
 * the exact inverse of sector 03's, which is why it comes straight after.
 *
 * FAKE PLATFORMS ARE DECOYS, NEVER THE ROUTE. A `fake-platform` always sits
 * beside a real path, never on it, and never over anything that kills —
 * taking the bait costs the climb and nothing else. That is the same rule
 * CLAUDE.md #4.7 sets for the fake exit ("первое появление в игре не
 * смертельно"), applied to the thing it is actually about: the player has
 * to be able to learn what a fake looks like by being wrong once, cheaply.
 * `LevelValidator` never counts one as a surface, so a level that needed
 * one to be solvable would be reported unsolvable.
 */
export const SECTOR_04_LEVELS: LevelDef[] = [
  {
    id: 'sector-04-level-01',
    name: 'CRUMBLE',
    width: 48,
    groundRow: 22,
    gaps: [],
    spikeColumns: [],
    platforms: [
      { col: 10, row: 19, width: 4 },
      { col: 35, row: 7, width: 6 },
    ],
    playerStartCol: 2,
    exitCol: 37,
    exitRow: 7,
    traps: [
      // The middle of the climb is made of platforms that crumble on
      // contact, so the ladder can only be taken at speed and in one
      // unbroken run. Failing it drops the player onto clean ground with
      // nothing under the fall — the cost of a mistake is the twelve
      // seconds of climb, not the attempt.
      { type: 'disappearing-platform', id: 'dp-01', col: 17, row: 16, width: 3 },
      { type: 'disappearing-platform', id: 'dp-02', col: 23, row: 13, width: 3 },
      { type: 'disappearing-platform', id: 'dp-03', col: 29, row: 10, width: 3 },
    ],
  },
  {
    id: 'sector-04-level-02',
    name: 'FREEFALL',
    width: 48,
    groundRow: 22,
    // A pit with no floor at all for twenty-five columns. The stepping
    // stones over it hold for a beat and then fall, which makes the whole
    // crossing a single committed rhythm rather than four separate jumps.
    gaps: [[14, 38]],
    spikeColumns: [8, 9],
    platforms: [],
    playerStartCol: 2,
    exitCol: 43,
    traps: [
      { type: 'falling-platform', id: 'flp-01', col: 14, row: 19, width: 3 },
      { type: 'falling-platform', id: 'flp-02', col: 20, row: 19, width: 3 },
      { type: 'falling-platform', id: 'flp-03', col: 26, row: 19, width: 3 },
      { type: 'falling-platform', id: 'flp-04', col: 32, row: 19, width: 3 },
    ],
  },
  {
    id: 'sector-04-level-03',
    name: 'GHOST FLOOR',
    width: 48,
    groundRow: 22,
    gaps: [],
    spikeColumns: [],
    platforms: [
      { col: 10, row: 19, width: 4 },
      { col: 14, row: 16, width: 4 },
      { col: 21, row: 13, width: 4 },
      { col: 28, row: 10, width: 4 },
      { col: 35, row: 7, width: 6 },
    ],
    playerStartCol: 2,
    exitCol: 37,
    exitRow: 7,
    traps: [
      // Each fake sits one hop further right than the real tier at the same
      // height — the tempting shortcut, always. Ordinary ground is under
      // both of them, so the first lesson costs a climb; by the third the
      // player is reading the tiles instead of trusting them.
      { type: 'fake-platform', id: 'fakep-01', col: 21, row: 16, width: 4 },
      { type: 'fake-platform', id: 'fakep-02', col: 28, row: 13, width: 4 },
      { type: 'fake-platform', id: 'fakep-03', col: 35, row: 10, width: 4 },
    ],
  },
  {
    id: 'sector-04-level-04',
    name: 'ORBIT',
    width: 48,
    groundRow: 22,
    gaps: [],
    spikeColumns: [],
    platforms: [
      { col: 10, row: 19, width: 5 },
      { col: 19, row: 16, width: 5 },
      { col: 28, row: 13, width: 5 },
      { col: 37, row: 10, width: 6 },
    ],
    playerStartCol: 2,
    exitCol: 39,
    exitRow: 10,
    traps: [
      // A spike on a fixed arm, never slowing, never reversing — each one
      // is parked on the gap between two tiers, so the jump is always
      // available and only ever at the wrong moment. The constant sweep is
      // its own telegraph (`TrapDef.ts`), which is why it needs no warning
      // phase and can be crossed on the first attempt by anyone watching.
      { type: 'orbit-spike', id: 'orbit-01', pivotCol: 17, pivotRow: 18, radiusTiles: 1.75, periodMs: 2200 },
      { type: 'orbit-spike', id: 'orbit-02', pivotCol: 26, pivotRow: 15, radiusTiles: 1.75, periodMs: 1800 },
      { type: 'orbit-spike', id: 'orbit-03', pivotCol: 35, pivotRow: 12, radiusTiles: 1.75, periodMs: 2600 },
    ],
  },
  {
    id: 'sector-04-level-05',
    name: 'PENDULUM',
    width: 48,
    groundRow: 22,
    gaps: [[24, 27]],
    spikeColumns: [16, 17],
    platforms: [{ col: 32, row: 19, width: 5 }],
    playerStartCol: 2,
    exitCol: 43,
    traps: [
      // Unlike the orbits, these visibly slow to a stop at each extreme —
      // the deceleration is the read, and the safe moment is when the
      // spike is farthest from the player rather than at a fixed beat.
      // Three of them at different periods across one corridor, so the
      // corridor never has a single safe rhythm.
      { type: 'swinging-spike', id: 'swing-01', pivotCol: 12, pivotRow: 15, lengthTiles: 3, maxAngleDeg: 42, periodMs: 1900 },
      { type: 'swinging-spike', id: 'swing-02', pivotCol: 21, pivotRow: 15, lengthTiles: 4, maxAngleDeg: 38, periodMs: 1500 },
      { type: 'swinging-spike', id: 'swing-03', pivotCol: 31, pivotRow: 14, lengthTiles: 3, maxAngleDeg: 46, periodMs: 2300 },
    ],
  },
  {
    id: 'sector-04-level-06',
    name: 'DISTRICT',
    width: 48,
    groundRow: 22,
    gaps: [[18, 30]],
    spikeColumns: [10, 11],
    platforms: [
      { col: 34, row: 19, width: 5 },
      { col: 34, row: 13, width: 6 },
    ],
    playerStartCol: 2,
    exitCol: 36,
    exitRow: 13,
    traps: [
      // Cross a pit on stones that fall, climb a ladder that crumbles, and
      // do both under a spike that never stops. Nothing new is introduced —
      // the sector's three ideas are simply asked at the same time.
      { type: 'falling-platform', id: 'flp-01', col: 18, row: 19, width: 3 },
      { type: 'falling-platform', id: 'flp-02', col: 24, row: 19, width: 3 },
      { type: 'disappearing-platform', id: 'dp-01', col: 29, row: 16, width: 3 },
      { type: 'fake-platform', id: 'fakep-01', col: 26, row: 13, width: 4 },
      { type: 'orbit-spike', id: 'orbit-01', pivotCol: 33, pivotRow: 16, radiusTiles: 1.75, periodMs: 2000 },
      { type: 'swinging-spike', id: 'swing-01', pivotCol: 14, pivotRow: 15, lengthTiles: 3, maxAngleDeg: 40, periodMs: 1700 },
    ],
  },
];
