import type { LevelDef } from '@/gameplay/LevelDef';

/**
 * SECTOR 02 — NEON GRID. The sector of timed vertical beams: lasers that
 * kill, timing gates that only block, and one bridge that moves on its own
 * schedule.
 *
 * What the sector is actually teaching is patience. Sector 01's hazards
 * could all be beaten by moving well; these cannot be beaten by moving at
 * all, only by choosing *when*. Every beam here has somewhere safe to stand
 * and watch it from — that standing room is load-bearing, not decoration,
 * and it is why a laser is fair even though it kills on contact. The level
 * is one screen (`LevelDef`), so the beam's whole cycle is visible from the
 * spawn point before the player commits to anything.
 *
 * NOTHING HERE IS RIDDEN INTO A BEAM. A hazard the player cannot steer away
 * from while it is lethal would break CLAUDE.md #4.5's reaction window no
 * matter how long its warning phase runs, so no laser ever crosses the path
 * `movp-01` carries the player along — the beams sit on the solid ground at
 * either end of the ride, where waiting is possible.
 */
export const SECTOR_02_LEVELS: LevelDef[] = [
  {
    id: 'sector-02-level-01',
    name: 'GRID ENTRY',
    width: 48,
    groundRow: 22,
    // The pit comes before the beam so the two lessons never overlap: clear
    // it, land, and only then face something that has to be waited out.
    gaps: [[16, 19]],
    spikeColumns: [10, 11],
    platforms: [],
    playerStartCol: 2,
    exitCol: 43,
    traps: [
      {
        type: 'laser',
        id: 'laser-01',
        col: 30,
        topRow: 16,
        bottomRow: 21,
      },
    ],
  },
  {
    id: 'sector-02-level-02',
    name: 'OFFSET',
    width: 48,
    groundRow: 22,
    gaps: [],
    spikeColumns: [],
    // The climb puts the exit above both beams, so they are crossed on the
    // way up rather than run past on a flat floor — and each tier is a
    // place to stand and watch the next one from.
    platforms: [
      { col: 14, row: 19, width: 5 },
      { col: 22, row: 16, width: 5 },
      { col: 30, row: 13, width: 5 },
      { col: 38, row: 10, width: 6 },
    ],
    playerStartCol: 2,
    exitCol: 40,
    exitRow: 10,
    traps: [
      // Same timing shape, deliberately out of phase (roughly half a cycle
      // apart) — there is no fixed "safe beat" that clears both, so they
      // have to be watched rather than memorised. Both are independently
      // honest at the default warning, and the tier before each is wide
      // enough to wait on indefinitely.
      { type: 'laser', id: 'laser-01', col: 20, topRow: 14, bottomRow: 21 },
      { type: 'laser', id: 'laser-02', col: 28, topRow: 11, bottomRow: 18, initialIdleMs: 1150 },
    ],
  },
  {
    id: 'sector-02-level-03',
    name: 'GATE',
    width: 48,
    groundRow: 22,
    gaps: [[26, 29]],
    spikeColumns: [34, 35],
    platforms: [{ col: 14, row: 19, width: 5 }],
    playerStartCol: 2,
    exitCol: 43,
    traps: [
      // A timing gate blocks but never kills, so this is the sector's one
      // safe place to learn the read: mistime it and you lose a beat, not
      // the attempt. It sits before the laser on purpose — the same
      // "watch the cycle, then go" skill, rehearsed without stakes first.
      { type: 'timing-gate', id: 'gate-01', col: 20, topRow: 16, bottomRow: 21 },
      { type: 'laser', id: 'laser-01', col: 38, topRow: 16, bottomRow: 21 },
    ],
  },
  {
    id: 'sector-02-level-04',
    name: 'CROSSFIRE',
    width: 48,
    groundRow: 22,
    gaps: [[18, 22]],
    spikeColumns: [12, 13],
    // A climb whose tiers alternate sides: the player crosses the level's
    // width three times, and a beam guards each crossing.
    platforms: [
      { col: 24, row: 19, width: 6 },
      { col: 34, row: 16, width: 6 },
      { col: 24, row: 13, width: 6 },
      { col: 14, row: 10, width: 6 },
    ],
    playerStartCol: 2,
    exitCol: 15,
    exitRow: 10,
    traps: [
      { type: 'laser', id: 'laser-01', col: 32, topRow: 17, bottomRow: 21 },
      { type: 'laser', id: 'laser-02', col: 31, topRow: 11, bottomRow: 15, initialIdleMs: 800 },
      { type: 'laser', id: 'laser-03', col: 21, topRow: 8, bottomRow: 12, initialIdleMs: 1500 },
    ],
  },
  {
    id: 'sector-02-level-05',
    name: 'MOVING BRIDGE',
    width: 48,
    groundRow: 22,
    // A pit far wider than any jump — the bridge is not a shortcut here, it
    // is the only way across, which is what makes waiting for it the whole
    // level. `LevelValidator` models the ride as a real edge between the
    // platform's two ends, so "solvable" means solvable *by riding it*.
    gaps: [[17, 33]],
    spikeColumns: [10, 11],
    platforms: [],
    playerStartCol: 2,
    exitCol: 43,
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
      // Both beams stand on solid ground, never over the ride — see the
      // file doc comment. The first is the toll for boarding, the second
      // the toll for getting off, and each has a full landing to wait on.
      { type: 'laser', id: 'laser-01', col: 13, topRow: 16, bottomRow: 21 },
      { type: 'laser', id: 'laser-02', col: 38, topRow: 16, bottomRow: 21, initialIdleMs: 900 },
    ],
  },
  {
    id: 'sector-02-level-06',
    name: 'GRID CORE',
    width: 48,
    groundRow: 22,
    gaps: [[20, 26]],
    spikeColumns: [8, 9, 33, 34],
    // The sector's exam: a gate to read, a bridge to board, beams on both
    // banks and a climb to an exit that is above all of it.
    platforms: [
      { col: 36, row: 19, width: 5 },
      { col: 30, row: 16, width: 5 },
      { col: 37, row: 13, width: 6 },
    ],
    playerStartCol: 2,
    exitCol: 39,
    exitRow: 13,
    traps: [
      { type: 'timing-gate', id: 'gate-01', col: 14, topRow: 16, bottomRow: 21 },
      {
        type: 'moving-platform',
        id: 'movp-01',
        fromCol: 18,
        fromRow: 19,
        toCol: 27,
        toRow: 19,
        width: 3,
        travelMs: 2600,
      },
      { type: 'laser', id: 'laser-01', col: 31, topRow: 17, bottomRow: 21 },
      { type: 'laser', id: 'laser-02', col: 34, topRow: 11, bottomRow: 15, initialIdleMs: 1300 },
    ],
  },
];
