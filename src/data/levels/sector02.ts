import type { LevelDef } from '@/gameplay/LevelDef';

/**
 * SECTOR 02 — NEON GRID. Nothing holds still.
 *
 * Sector 01 taught that the floor can betray you. This one takes the idea
 * off the ground: ledges that crumble once you land, spikes that travel on
 * curves instead of lines, and one bridge that is genuinely the only way
 * across. The common thread is that standing still stops being the safe
 * default — which is the exact habit sector 03's timed beams will then
 * demand back.
 *
 *   01 CRUMBLE   — the ledge falls after you land on it
 *   02 PENDULUM  — a spike that swings, and visibly slows to turn
 *   03 ORBIT     — a spike that circles and never slows
 *   04 FREEFALL  — the floor that drops, now over a real pit
 *   05 BRIDGE    — a pit no jump can cross
 *   06 GRID CORE — all of it, climbing
 */
export const SECTOR_02_LEVELS: LevelDef[] = [
  {
    id: 'sector-02-level-01',
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
      // The middle of the climb is made of ledges that crumble on contact,
      // so the ladder can only be taken in one unbroken run. Failing it
      // drops the player onto clean ground with nothing underneath — the
      // cost of a mistake is the climb, not the attempt. That is what makes
      // this the right place to learn the mechanic rather than sector 05.
      { type: 'disappearing-platform', id: 'dp-01', col: 17, row: 16, width: 3 },
      { type: 'disappearing-platform', id: 'dp-02', col: 23, row: 13, width: 3 },
      { type: 'disappearing-platform', id: 'dp-03', col: 29, row: 10, width: 3 },
    ],
  },
  {
    id: 'sector-02-level-02',
    name: 'PENDULUM',
    width: 48,
    groundRow: 22,
    gaps: [[24, 27]],
    spikeColumns: [16, 17],
    platforms: [{ col: 32, row: 19, width: 5 }],
    playerStartCol: 2,
    exitCol: 43,
    traps: [
      // A swing visibly decelerates to turn around at each extreme, and the
      // deceleration is the read: the safe moment is when the spike is
      // farthest away, not a fixed beat. Three of them at different periods
      // across one corridor, so there is no single rhythm that clears the
      // level — each has to be watched on approach.
      { type: 'swinging-spike', id: 'swing-01', pivotCol: 12, pivotRow: 15, lengthTiles: 3, maxAngleDeg: 42, periodMs: 2100 },
      { type: 'swinging-spike', id: 'swing-02', pivotCol: 21, pivotRow: 15, lengthTiles: 4, maxAngleDeg: 38, periodMs: 1700 },
      { type: 'swinging-spike', id: 'swing-03', pivotCol: 31, pivotRow: 14, lengthTiles: 3, maxAngleDeg: 46, periodMs: 2400 },
    ],
  },
  {
    id: 'sector-02-level-03',
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
      // The opposite read to the pendulum, which is why it follows it
      // directly: a fixed arm at constant speed, never slowing, never
      // reversing. Each one is parked on the gap between two tiers, so the
      // jump is always available and only ever at the wrong moment. The
      // steady sweep is its own telegraph (`TrapDef.ts`) — no warning phase
      // needed, and crossable first try by anyone watching.
      { type: 'orbit-spike', id: 'orbit-01', pivotCol: 17, pivotRow: 18, radiusTiles: 1.75, periodMs: 2400 },
      { type: 'orbit-spike', id: 'orbit-02', pivotCol: 26, pivotRow: 15, radiusTiles: 1.75, periodMs: 2000 },
      { type: 'orbit-spike', id: 'orbit-03', pivotCol: 35, pivotRow: 12, radiusTiles: 1.75, periodMs: 2800 },
    ],
  },
  {
    id: 'sector-02-level-04',
    name: 'FREEFALL',
    width: 48,
    groundRow: 22,
    // EVERY OTHER STONE HOLDS. The first cut of this level was four
    // falling stones over a twenty-five-column pit and nothing else, which
    // the owner played and rejected in the plainest terms: "все блоки прям
    // под тобой падают, даже нет возможности увернуться". He is describing
    // a level with exactly one solution and no room inside it — miss the
    // rhythm once and the crossing is already lost, with nothing to do
    // about it.
    //
    // Now the chain alternates, and it is continuous. Three solid slabs
    // make a complete route across on their own — the solver proves it,
    // because it counts no falling floor as a surface at all — and the two
    // stones between them close the walkway into one unbroken run. So the
    // level can be taken at a sprint, or slab to slab in three hops, and
    // the stones decide which by whether the player keeps moving.
    gaps: [[14, 34]],
    spikeColumns: [8, 9],
    platforms: [
      { col: 17, row: 19, width: 3 },
      { col: 23, row: 19, width: 3 },
      { col: 29, row: 19, width: 3 },
    ],
    playerStartCol: 2,
    exitCol: 43,
    traps: [
      // Slotted between the slabs with no seam anywhere: 17..31 is one
      // unbroken walkway, so running it flat out works — three columns take
      // 270ms and a stone holds for 320ms. Stop or hesitate on one and it
      // is gone, and the crossing becomes three deliberate hops between the
      // slabs (30px each, against a 57.9px jump) with holes where the
      // stones used to be.
      { type: 'falling-platform', id: 'flp-01', col: 20, row: 19, width: 3 },
      { type: 'falling-platform', id: 'flp-02', col: 26, row: 19, width: 3 },
    ],
  },
  {
    id: 'sector-02-level-05',
    name: 'BRIDGE',
    width: 48,
    groundRow: 22,
    // A pit far wider than any jump, with a slab that is genuinely
    // transport rather than a moving floor — the same trap as sector 01's
    // SHIFT, sized the other way round so what reads is the bridge, not the
    // hole. `LevelValidator` models the ride as a real edge between its two
    // ends, so "solvable" here means solvable *by riding it*.
    gaps: [[17, 33]],
    spikeColumns: [10, 11],
    platforms: [{ col: 38, row: 19, width: 5 }],
    playerStartCol: 2,
    exitCol: 40,
    exitRow: 19,
    traps: [
      {
        type: 'moving-platform',
        id: 'movp-01',
        fromCol: 15,
        fromRow: 19,
        toCol: 32,
        toRow: 19,
        width: 3,
        travelMs: 3400,
      },
      // On solid ground at the boarding end, never over the ride: a hazard
      // the player cannot steer away from while it is lethal would break
      // CLAUDE.md #4.5's reaction window no matter how long its warning ran.
      // This is the toll for getting on, taken somewhere it is possible to
      // wait.
      { type: 'swinging-spike', id: 'swing-01', pivotCol: 13, pivotRow: 15, lengthTiles: 4, maxAngleDeg: 40, periodMs: 1800 },
    ],
  },
  {
    id: 'sector-02-level-06',
    name: 'GRID CORE',
    width: 48,
    groundRow: 22,
    // The sector's exam: cross a moving floor, climb ledges that will not
    // wait, and do it under an orbit that never stops. The exit is at the
    // top, so every idea has to be solved on the way through.
    gaps: [[15, 20]],
    spikeColumns: [9, 10],
    platforms: [
      { col: 24, row: 19, width: 5 },
      { col: 38, row: 13, width: 6 },
    ],
    playerStartCol: 2,
    exitCol: 40,
    exitRow: 13,
    traps: [
      {
        type: 'moving-platform',
        id: 'movp-01',
        fromCol: 15,
        fromRow: 22,
        toCol: 17,
        toRow: 22,
        width: 4,
        travelMs: 2200,
      },
      { type: 'disappearing-platform', id: 'dp-01', col: 31, row: 16, width: 4 },
      { type: 'orbit-spike', id: 'orbit-01', pivotCol: 29, pivotRow: 18, radiusTiles: 1.75, periodMs: 1900 },
      { type: 'swinging-spike', id: 'swing-01', pivotCol: 36, pivotRow: 9, lengthTiles: 3, maxAngleDeg: 44, periodMs: 1600 },
    ],
  },
];
