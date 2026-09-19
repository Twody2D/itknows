import type { LevelDef } from '@/gameplay/LevelDef';
import { dropSpike, floorSpikes } from './ambush';

/**
 * SECTOR 10 — TERMINAL. Всё, чему тебя научили, и ничего нового.
 *
 * The end of the campaign, and it introduces nothing. That is the whole
 * design: nine sectors each asked one question, and the tenth asks them
 * again, one per level, in the order they were taught — then puts all of
 * them on one screen.
 *
 *   01 RECALL   — the ground springs on you again (01), on a clock (03)
 *   02 PATIENCE — two beams to wait out, and a drone charging for the wait (03, 05)
 *   03 MIRAGE   — what looks like footing, and the campaign's last false door (04)
 *   04 MACHINE  — belt, pad, and spikes on a period that will not line up (06, 07, 08)
 *   05 VOID     — no floor, with the machinery still running (09)
 *   06 TERMINAL — the tallest climb in the game, one of everything
 *
 * WHY A RETROSPECTIVE AND NOT A NEW IDEA. A finale that introduces a
 * mechanic asks the player to learn something in the last six levels of a
 * sixty-level game and then never use it. Sector 05 closed the original
 * campaign the same way — by attacking the habit the sectors before it had
 * built — and this closes the whole of it by asking whether those habits
 * survived being stacked.
 *
 * THE CAMPAIGN'S LAST FAKE EXIT IS ON `MIRAGE`, at the far right of the
 * ground, past the climb that actually leads out. One per sector is the cap
 * (CLAUDE.md #4.7) and the rule about placement is the one `sector05.ts` had
 * to be repaired into: a door you cannot decline is a toll booth, so this one
 * sits where nobody passes unless they walked past their own route to reach
 * it.
 */
export const SECTOR_10_LEVELS: LevelDef[] = [
  {
    id: 'sector-10-level-01',
    name: 'RECALL',
    width: 48,
    groundRow: 22,
    gaps: [[24, 28]],
    spikeColumns: [7, 8],
    platforms: [
      { col: 33, row: 19, width: 5 },
      { col: 40, row: 16, width: 6 },
    ],
    playerStartCol: 2,
    exitCol: 42,
    exitRow: 16,
    traps: [
      // Sector 01's vocabulary, in sector 01's order: something that drops
      // as you arrive, then something that comes up out of the floor.
      ...dropSpike('dspike-01', 13, 21, 22),
      ...floorSpikes('sbank-01', 18, 3, 22),
      // And sector 03's: a thing that does not care where the player is at
      // all, past the pit, guarding the foot of the climb.
      { type: 'laser', id: 'laser-01', col: 31, topRow: 17, bottomRow: 21 },
    ],
  },
  {
    id: 'sector-10-level-02',
    name: 'PATIENCE',
    width: 48,
    groundRow: 22,
    gaps: [],
    spikeColumns: [11, 12],
    platforms: [{ col: 38, row: 19, width: 6 }],
    playerStartCol: 4,
    exitCol: 40,
    exitRow: 19,
    traps: [
      // The sector-05 trade, stated once more and for the last time: every
      // beam here is a wait, and the drone is what the wait costs. At 0.65 it
      // is slower than the player, so the level is always survivable by
      // moving well (CLAUDE.md #13).
      { type: 'pursuer', id: 'pursuer-01', col: 1, row: 21, speedFactor: 0.65 },
      { type: 'laser', id: 'laser-01', col: 18, topRow: 16, bottomRow: 21 },
      { type: 'laser', id: 'laser-02', col: 26, topRow: 16, bottomRow: 21, initialIdleMs: 800 },
      {
        type: 'electric-floor',
        id: 'ef-01',
        col: 32,
        width: 5,
        row: 22,
        timing: { idleMs: 2400, warningMs: 500, activeMs: 500, cooldownMs: 250 },
      },
    ],
  },
  {
    id: 'sector-10-level-03',
    name: 'MIRAGE',
    width: 48,
    groundRow: 22,
    gaps: [],
    spikeColumns: [9, 10],
    platforms: [
      { col: 16, row: 19, width: 5 },
      { col: 24, row: 16, width: 5 },
      { col: 32, row: 13, width: 6 },
    ],
    playerStartCol: 2,
    exitCol: 34,
    exitRow: 13,
    traps: [
      // The flat continuation of the row-19 tier, which is the shape a
      // player reads as "keep going" — and the climb above does not need it
      // at all. Falling through costs the tier, never the attempt: nothing
      // lethal sits under any of its columns, which is the rule that keeps
      // an unreadable decoy honest (CLAUDE.md #4.2's 2026-09-14 decision).
      { type: 'fake-platform', id: 'fake-01', col: 21, row: 19, width: 3 },
      // THE LAST FALSE DOOR IN THE GAME. Column 43 on the ground: the climb
      // turns up at column 16, so reaching this one means walking the whole
      // length of the level past the route that works.
      { type: 'fake-exit', id: 'fake-exit-01', col: 43, row: 22 },
    ],
  },
  {
    id: 'sector-10-level-04',
    name: 'MACHINE',
    width: 48,
    groundRow: 22,
    gaps: [],
    spikeColumns: [5, 6],
    platforms: [
      { col: 21, row: 17, width: 8 },
      { col: 32, row: 14, width: 7 },
    ],
    playerStartCol: 2,
    exitCol: 34,
    exitRow: 14,
    traps: [
      // Sector 08 hands the player to sector 06, and sector 07 decides
      // whether they should get on: the belt feeds the pad, the pad throws
      // on its own 2300 ms cycle, and the spikes overhead run at 4000 so the
      // two never settle into a rhythm to memorise.
      { type: 'conveyor', id: 'belt-01', col: 10, row: 22, width: 6, speed: 45 },
      { type: 'launch-pad', id: 'pad-01', col: 17, row: 22, width: 3, liftTiles: 6 },
      {
        type: 'spike-bank',
        id: 'sbank-01',
        col: 17,
        width: 3,
        hiddenRow: 13,
        lethalRow: 17,
        timing: { idleMs: 1500, warningMs: 900, activeMs: 1200, cooldownMs: 400 },
      },
    ],
  },
  {
    id: 'sector-10-level-05',
    name: 'VOID',
    width: 48,
    groundRow: 22,
    gaps: [[6, 47]],
    spikeColumns: [],
    platforms: [
      { col: 8, row: 21, width: 3 },
      { col: 22, row: 17, width: 3 },
      { col: 31, row: 11, width: 6 },
    ],
    playerStartCol: 2,
    exitCol: 33,
    exitRow: 11,
    traps: [
      // Sector 09's removal, with sector 08's floor and sector 06's pad
      // still running inside it. The belt pushes back toward the gap the
      // player just crossed; the pad is the only way onto the last tier.
      { type: 'conveyor', id: 'belt-01', col: 14, row: 19, width: 5, speed: -45 },
      { type: 'launch-pad', id: 'pad-01', col: 28, row: 17, width: 3, liftTiles: 7 },
    ],
  },
  {
    id: 'sector-10-level-06',
    name: 'TERMINAL',
    width: 48,
    groundRow: 22,
    gaps: [[26, 31]],
    spikeColumns: [5, 6],
    // Seventeen rows from the spawn tile to the door, the tallest climb in
    // the campaign, and every step on it is something the player has already
    // been taught: a sprung spike, a belt, a launch, a step that will not
    // stay, a beam across the last hop.
    platforms: [
      { col: 23, row: 16, width: 4 },
      { col: 35, row: 10, width: 5 },
      { col: 27, row: 7, width: 6 },
    ],
    playerStartCol: 2,
    exitCol: 29,
    exitRow: 7,
    traps: [
      ...dropSpike('dspike-01', 10, 21, 22),
      { type: 'conveyor', id: 'belt-01', col: 13, row: 22, width: 5, speed: 45 },
      { type: 'launch-pad', id: 'pad-01', col: 19, row: 22, width: 3, liftTiles: 7 },
      { type: 'disappearing-platform', id: 'dp-01', col: 29, row: 13, width: 3 },
      // Across the last hop of the campaign, and off to the side of every
      // ledge it borders — the arc crosses it, the landings do not.
      { type: 'laser', id: 'laser-01', col: 33, topRow: 5, bottomRow: 9 },
    ],
  },
];
