import type { LevelDef } from '@/gameplay/LevelDef';
import { dropSpike, floorSpikes, shiftingPit } from './ambush';

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

/**
 * PISTON ROW's own cycle — up far more of the time than the sector default:
 * 700ms of the loop instead of 300ms.
 *
 * Measured, because guessing is what got this wrong the first time. On the
 * old cycle each piston was lethal for 15% of its loop, so walking the row
 * with no plan at all cleared it about 60% of the time — five scripted
 * "hold right, tap jump" runs won four of them, which is precisely the
 * owner's "я буквально втупую пропрыгал весь уровень". At 38% per piston,
 * the same run loses far more often than it wins, and the level asks what
 * it was always supposed to ask: watch the row, then move.
 *
 * `warningMs` cut from 500 to 380 one round later — "шипы должны появляться
 * чуть быстрее" (owner). This is the punch-up tween's own duration
 * (`SpikeBankTrap.onEnterPhase('warning')`), so a shorter number is a
 * snappier rise, not a shorter telegraph: `Quint.easeIn` already spends most
 * of it barely clearing the floor, and 380ms still clears `MIN_WARNING_MS`
 * (250) with margin. Nothing else about the cycle moved — a piston is lethal
 * for slightly more of a slightly shorter loop (700 of 1730ms, 40%, up from
 * 38% of 1850ms), which is the same direction this level has always been
 * tuned in, not a new axis.
 */
const PISTON_TIMING = { idleMs: 400, warningMs: 380, activeMs: 700, cooldownMs: 250 } as const;

export const SECTOR_03_LEVELS: LevelDef[] = [
  {
    id: 'sector-03-level-01',
    name: 'BEAM',
    width: 48,
    groundRow: 22,
    // The pit comes before the beam so the two never overlap: clear it,
    // land, and only then meet something that has to be waited out.
    // The second pit is the sector-01 shifting hole, brought back on open
    // flat ground with a clear sightline. SHIFT introduced it at the far
    // end of a bridge ride, which is a fine place for it and a terrible
    // place to *see* it — the owner reported never having met the trap at
    // all. Here there is nothing else to look at while it moves.
    gaps: [
      [16, 19],
      [34, 39],
    ],
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
      ...dropSpike('dspike-01', 27, 21, 22),
      { type: 'laser', id: 'laser-01', col: 30, topRow: 16, bottomRow: 21 },
      // Reads as a hole at 34-36 with a ledge at 37-39 to land on; crossing
      // the line at 26 slides the slab left, so the hole is at 37-39 by the
      // time the jump is taken. Eight columns is 727ms of approach against
      // a 420ms shift.
      ...shiftingPit('sp-01', 37, 34, 3),
    ],
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

      // UNDER THE THIRD TIER, and `pnpm levels` reports that the proved
      // route never meets it — correctly, because the route climbs and never
      // comes back down. It charges for coming back down: fall off the
      // row-13 ledge and this is what the ground has waiting. Without it the
      // third tier is the one rung on the climb that costs nothing to miss.
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

      // Moved clear of the platform overhead. A trigger band is five tiles
      // tall now — it has to be, to catch a player jumping across it
      // (`APPROACH_BAND_TILES`) — and at the old column it reached up into
      // the ledge above, so simply standing on that ledge spent the trap
      // on nobody.
      ...dropSpike('dspike-01', 23, 21, 22),
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

      // Columns 36-38, not 31-33. At 31 it shared columns 31-32 with the
      // third piston and its trigger band sat under the second — two
      // machines on the same tiles, which is what the owner saw: "плохо
      // срабатывают тригеры, шипы друг на друга налазят". Past the last
      // piston it has clear floor on both sides and a clear run-up.
      ...floorSpikes('sbank-04', 36, 3, 22),
      // CEILING TEETH — the answer to "я буквально втупую пропрыгал весь
      // уровень".
      //
      // A piston is one tile tall and a jump clears 34.7px, so vaulting
      // every one of them was not a mistake the level could punish: the
      // safest way through a row of pistons was to never touch the floor.
      // These hang over the standing room BETWEEN the pistons at a height
      // that is chosen, not eyeballed — lethal at row 17 (y 170-180), where
      // a standing android's head is at y 188 and a jumping one's reaches
      // y 153. Walking under them is free. Jumping under them is not.
      //
      // Offset half a cycle from the pistons they sit between, so the row
      // reads as one machine alternating top and bottom rather than two
      // unrelated hazards.
      { type: 'spike-bank', id: 'sbank-05', col: 18, width: 3, hiddenRow: 15, lethalRow: 17, timing: PISTON_TIMING, initialIdleMs: 1050 },
      { type: 'spike-bank', id: 'sbank-06', col: 26, width: 3, hiddenRow: 15, lethalRow: 17, timing: PISTON_TIMING, initialIdleMs: 1750 },
      // `pnpm levels` reports both of these as unmet by the proved route,
      // and that report is the paragraph above restated as a measurement:
      // the solver walks, a walking android's head stops at y=188, and these
      // stop at y=180. They exist for the player who jumps, which is the
      // behaviour the row is built to take away.
      // Three pistons with four clear columns of standing room between
      // them. Hidden inside the ground fill at row 23, lethal at row 21 —
      // the row the player actually walks through — so a piston that is up
      // is a wall as much as a hazard. Dimly visible at idle by design
      // (`TrapDef.ts`): a machine filling a whole span would be unreadable
      // rather than hard if it hid itself.
      { type: 'spike-bank', id: 'sbank-01', col: 14, width: 3, hiddenRow: 23, lethalRow: 21, timing: PISTON_TIMING },
      {
        type: 'spike-bank',
        id: 'sbank-02',
        col: 22,
        width: 3,
        hiddenRow: 23,
        lethalRow: 21,
        timing: PISTON_TIMING,
        initialIdleMs: 700,
      },
      {
        type: 'spike-bank',
        id: 'sbank-03',
        col: 30,
        width: 3,
        hiddenRow: 23,
        lethalRow: 21,
        timing: PISTON_TIMING,
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
      // COLUMN 32, NOT 33. The tier below runs 32-36 and the climb arrives
      // on its left edge, so a piston over 33-35 slammed onto three tiles
      // the route has no reason to stand on — the player lands at 32 and
      // leaves left, one tile clear of it, every time. Moved one column left
      // so it covers the tile the pause actually happens on, which is what
      // the comment above it always claimed.
      {
        type: 'spike-bank',
        id: 'sbank-02',
        col: 32,
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
