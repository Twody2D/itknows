import type { LevelDef } from '@/gameplay/LevelDef';

/**
 * SECTOR 09 — SCAFFOLD. Пола больше нет.
 *
 * Forty-eight levels have been built on a floor. It has been trapped,
 * electrified, dropped out from under the player, made to crumble and made
 * to move — but it was always there to come back to, and every mistake in
 * sectors 01-08 was paid for in time on that floor. Here it simply stops
 * existing past the spawn ledge: one long pit, and everything above it is
 * frame.
 *
 *   01 FIRST STEP — leaving the last solid ground in the campaign
 *   02 NARROW     — two tiles at a time, nothing underneath
 *   03 CRUMBLE    — half the steps are not there for long
 *   04 CONVEY     — the step itself moves, and the end of it is the void
 *   05 THROW      — every ledge is a pad, and none of them asks first
 *   06 SCAFFOLD   — all of it, up the frame
 *
 * NO NEW TRAP TYPE, AND NOTHING NEW TO READ. Both new mechanics for the back
 * half were spent (the pad in 06, the belt in 08) and this sector adds
 * nothing to the list of things that can hurt the player. What changed is
 * the cost of being wrong: the sector is one long removal, not one more
 * addition.
 *
 * WHY THIS IS NOT CRUELTY. A fall kills instantly and restarts in under
 * 700 ms on one tap (CLAUDE.md #5) — the cheapest failure the game has, and
 * far cheaper than sector 07's walk back from a closed gate. Every route is
 * still proved by the solver with the crumbling steps counted as surfaces
 * that always return, so no attempt can end in a dead end (#4.3/#4.4). And
 * the whole structure is visible from the spawn tile, which is the one
 * thing that has been true since sector 01.
 */
export const SECTOR_09_LEVELS: LevelDef[] = [
  {
    id: 'sector-09-level-01',
    name: 'FIRST STEP',
    width: 48,
    groundRow: 22,
    // Six columns of ground and then nothing. The spawn ledge is the last
    // floor in the campaign, and the level is arranged so the player can see
    // that before they move.
    gaps: [[6, 47]],
    spikeColumns: [],
    platforms: [
      { col: 7, row: 21, width: 3 },
      { col: 13, row: 19, width: 3 },
      { col: 19, row: 17, width: 3 },
      { col: 25, row: 15, width: 3 },
      { col: 31, row: 13, width: 4 },
    ],
    playerStartCol: 2,
    exitCol: 33,
    exitRow: 13,
    traps: [],
  },
  {
    id: 'sector-09-level-02',
    name: 'NARROW',
    width: 48,
    groundRow: 22,
    gaps: [[6, 47]],
    spikeColumns: [],
    // Two tiles wide, and the first two steps are at the same height: a flat
    // gap of five tiles against 5.8 of reach, which is the longest jump in
    // the game and the first time it has ever been asked for over nothing.
    platforms: [
      { col: 8, row: 21, width: 2 },
      { col: 15, row: 21, width: 2 },
      { col: 22, row: 20, width: 2 },
      { col: 28, row: 18, width: 2 },
      { col: 34, row: 16, width: 3 },
      { col: 40, row: 14, width: 4 },
    ],
    playerStartCol: 2,
    exitCol: 42,
    exitRow: 14,
    traps: [],
  },
  {
    id: 'sector-09-level-03',
    name: 'CRUMBLE',
    width: 48,
    groundRow: 22,
    gaps: [[6, 47]],
    spikeColumns: [],
    platforms: [
      { col: 8, row: 21, width: 3 },
      { col: 20, row: 17, width: 3 },
      { col: 32, row: 13, width: 4 },
    ],
    playerStartCol: 2,
    exitCol: 34,
    exitRow: 13,
    traps: [
      // EVERY SECOND STEP. Sector 02 taught these over a floor, where
      // falling through one cost a few seconds of walking back; here it
      // costs the attempt. They still come back on their own cycle, and the
      // step before each one is permanent, so waiting for the next window is
      // always an option — which is what keeps this a question about nerve
      // rather than a dead end.
      { type: 'disappearing-platform', id: 'dp-01', col: 14, row: 19, width: 3 },
      { type: 'disappearing-platform', id: 'dp-02', col: 26, row: 15, width: 3 },
    ],
  },
  {
    id: 'sector-09-level-04',
    name: 'CONVEY',
    width: 48,
    groundRow: 22,
    gaps: [[6, 47]],
    spikeColumns: [],
    platforms: [
      { col: 8, row: 21, width: 4 },
      { col: 22, row: 17, width: 4 },
      { col: 36, row: 13, width: 4 },
    ],
    playerStartCol: 2,
    exitCol: 37,
    exitRow: 13,
    traps: [
      // SECTOR 08'S FLOOR, WITH NOTHING UNDER IT. On SORTING FLOOR standing
      // still on a belt cost a walk back; on a belt that ends in open air it
      // costs the attempt. The first one runs toward its far end, the second
      // back toward the edge the player just left — so one is answered by
      // moving early and the other by not landing late.
      { type: 'conveyor', id: 'belt-01', col: 14, row: 19, width: 5, speed: 50 },
      { type: 'conveyor', id: 'belt-02', col: 28, row: 15, width: 5, speed: -50 },
    ],
  },
  {
    id: 'sector-09-level-05',
    name: 'THROW',
    width: 48,
    groundRow: 22,
    gaps: [[6, 47]],
    spikeColumns: [],
    platforms: [
      { col: 13, row: 17, width: 2 },
      { col: 21, row: 12, width: 4 },
      { col: 28, row: 9, width: 4 },
    ],
    playerStartCol: 2,
    exitCol: 30,
    exitRow: 9,
    traps: [
      // THE LEDGE IS THE PAD. In sector 06 a launch that came at the wrong
      // moment put the player back on the floor to try again; there is no
      // floor here, so the pad's warning phase is the only thing between a
      // launch and the drop. Same mechanic, same telegraph, and the cost of
      // ignoring it is now the whole attempt.
      { type: 'launch-pad', id: 'pad-01', col: 8, row: 21, width: 3, liftTiles: 5 },
      { type: 'launch-pad', id: 'pad-02', col: 15, row: 17, width: 3, liftTiles: 6 },
    ],
  },
  {
    id: 'sector-09-level-06',
    name: 'SCAFFOLD',
    width: 48,
    groundRow: 22,
    gaps: [[6, 47]],
    spikeColumns: [],
    platforms: [
      { col: 8, row: 21, width: 3 },
      { col: 22, row: 17, width: 3 },
      { col: 30, row: 10, width: 6 },
      { col: 24, row: 7, width: 6 },
    ],
    playerStartCol: 2,
    exitCol: 26,
    exitRow: 7,
    traps: [
      // One of each, in the order the campaign taught them, up the frame:
      // a belt that pushes back the way you came, a step that will not be
      // there long, and a pad that decides when you leave.
      { type: 'conveyor', id: 'belt-01', col: 14, row: 19, width: 5, speed: -45 },
      { type: 'disappearing-platform', id: 'dp-01', col: 28, row: 15, width: 3 },
      { type: 'launch-pad', id: 'pad-01', col: 34, row: 15, width: 3, liftTiles: 7 },
    ],
  },
];
