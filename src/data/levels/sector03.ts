import type { LevelDef } from '@/gameplay/LevelDef';
import { dropSpike, floorSpikes } from './ambush';

/**
 * SECTOR 03 — INDUSTRIAL CORE. Everything runs on a clock.
 *
 * The first two sectors could be beaten by moving well. Nothing here can:
 * these hazards do not react to the player at all, they simply cycle, and
 * the only answer is choosing *when*. That is why it lands third — sector 02
 * spent six levels teaching that standing still is dangerous, and this one
 * gives waiting back its value, on its own terms.
 *
 *   01 BEAM       — one beam, one decision
 *   02 OFFSET     — two beams that never agree
 *   03 GATE       — the same read, rehearsed where a mistake costs a beat
 *   04 PISTON ROW — the floor punches up
 *   05 SQUEEZE    — walls that close sideways and cannot be jumped
 *   06 CORE       — all of it, climbing
 *
 * Every beam and machine here has somewhere safe to stand and watch it from,
 * and that standing room is load-bearing rather than decoration: it is what
 * makes a hazard that kills on contact fair. And nothing cycles in sync —
 * each one gets its own `initialIdleMs`, so no level can be solved by
 * learning a single rhythm and holding it. That is the difference between a
 * level that is demanding and one that is a memory test.
 */

/** The sector's honest machine cycle: half a second of visible warning, twice `MIN_WARNING_MS`. */
const MACHINE_TIMING = { idleMs: 900, warningMs: 500, activeMs: 300, cooldownMs: 250 } as const;

export const SECTOR_03_LEVELS: LevelDef[] = [
  {
    id: 'sector-03-level-01',
    name: 'BEAM',
    width: 48,
    groundRow: 22,
    // The pit comes before the beam so the two never overlap: clear it,
    // land, and only then meet something that has to be waited out.
    gaps: [[16, 19]],
    spikeColumns: [10, 11],
    platforms: [],
    playerStartCol: 2,
    exitCol: 43,
    traps: [

      // Sector 03 is built out of clocks, and a clock is something you wait
      // out. Every level in it now also carries one thing that does not
      // wait — fired by walking into it, so the sector cannot be cleared by
      // patience alone (owner: "большинство уровней проходятся быстро с
      // первой попытки").
      ...dropSpike('dspike-01', 27, 21, 22),{ type: 'laser', id: 'laser-01', col: 30, topRow: 16, bottomRow: 21 }],
  },
  {
    id: 'sector-03-level-02',
    name: 'OFFSET',
    width: 48,
    groundRow: 22,
    gaps: [],
    spikeColumns: [],
    // The climb puts the exit above both beams, so they are crossed on the
    // way up rather than run past on a flat floor — and each tier is a
    // place to stand and read the next one from.
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

      ...floorSpikes('sbank-01', 31, 3, 22),
      // Same cycle, deliberately half a beat apart — there is no fixed
      // moment that clears both, so they have to be watched rather than
      // memorised. Both are independently honest at the default warning,
      // and the tier before each is wide enough to wait on indefinitely.
      { type: 'laser', id: 'laser-01', col: 20, topRow: 14, bottomRow: 21 },
      { type: 'laser', id: 'laser-02', col: 28, topRow: 11, bottomRow: 18, initialIdleMs: 1150 },
    ],
  },
  {
    id: 'sector-03-level-03',
    name: 'GATE',
    width: 48,
    groundRow: 22,
    gaps: [[26, 29]],
    spikeColumns: [34, 35],
    platforms: [{ col: 14, row: 19, width: 5 }],
    playerStartCol: 2,
    exitCol: 43,
    traps: [

      ...dropSpike('dspike-01', 20, 21, 22),
      // A timing gate blocks but never kills, so this is the sector's one
      // safe place to drill the read: mistime it and you lose a beat, not
      // the attempt. It stands before the beam on purpose — same skill,
      // rehearsed without stakes first, then charged for.
      { type: 'timing-gate', id: 'gate-01', col: 20, topRow: 16, bottomRow: 21 },
      { type: 'laser', id: 'laser-01', col: 38, topRow: 16, bottomRow: 21 },
    ],
  },
  {
    id: 'sector-03-level-04',
    name: 'PISTON ROW',
    width: 48,
    groundRow: 22,
    gaps: [],
    spikeColumns: [8, 9],
    platforms: [],
    playerStartCol: 2,
    exitCol: 43,
    traps: [

      // Three banks on a clock, and a fourth that is not on one.
      ...floorSpikes('sbank-04', 31, 3, 22),
      // Three pistons with four clear columns of standing room between
      // them. Hidden inside the ground fill at row 23, lethal at row 21 —
      // the row the player actually walks through — so a piston that is up
      // is a wall as much as a hazard. Dimly visible at idle by design
      // (`TrapDef.ts`): a machine filling a whole span would be unreadable
      // rather than hard if it hid itself.
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
    id: 'sector-03-level-05',
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

      ...dropSpike('dspike-01', 24, 21, 22),
      // Walls grow sideways out of a fixed edge instead of up or down, so
      // unlike a piston they cannot be jumped over — the only answer is to
      // not be in the span. They close toward each other from opposite
      // sides with clear ground between, which is the level's one place to
      // stand and read them both at once.
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
    id: 'sector-03-level-06',
    name: 'CORE',
    width: 48,
    groundRow: 22,
    gaps: [[25, 29]],
    spikeColumns: [17, 18],
    // The zig-zag crosses back over itself twice and a machine waits on
    // each turn: a piston on the ground, a press over the second tier, a
    // wall across the third, and a beam guarding the first climb.
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

      ...dropSpike('dspike-01', 13, 21, 22),
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
      { type: 'laser', id: 'laser-01', col: 31, topRow: 17, bottomRow: 21, initialIdleMs: 900 },
      // `hiddenRow` above `lethalRow` hangs the same machine upside down
      // (`TrapDef.ts`) — it slams down onto the tier the climb has to pause
      // on. The landing is safe; staying on it is not.
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
