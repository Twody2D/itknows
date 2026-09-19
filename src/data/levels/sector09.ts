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
 * NO NEW TRAP TYPE. Both new mechanics for the back half were spent (the pad
 * in 06, the belt in 08), so nothing here is a thing the player has not met.
 * What changed is the cost of being wrong: the sector is one long removal,
 * not one more addition.
 *
 * REBUILT 2026-09-19, AFTER THE FIRST FULL PLAYTHROUGH. The owner played the
 * finished campaign and said of this sector «тоже слишком лёгкий, мало
 * ловушек», and the count agreed with him: nine traps across six levels,
 * against nineteen a sector in the first half — and two of the six levels
 * had none at all. The removal had been mistaken for the content. Taking the
 * floor away is a premise, not a question: once a player works out that every
 * jump is inside their reach, a staircase over a void is still a staircase,
 * and there is nothing left to read.
 *
 * WHAT THE REBUILD IS ALLOWED TO ADD, and this is the rule every one of the
 * fourteen new hazards obeys: over a pit the fall already costs the attempt,
 * so a hazard parked on a step would only make that step lethal twice and
 * teach nothing. Each addition sits in a gap the player crosses or on a
 * surface the player is carried along — it asks WHEN to leave, never punishes
 * having arrived. The two exceptions prove it: the bank on CONVEY rises
 * through a belt that is actively carrying the player into it, and the one on
 * THROW hangs over a pad that fires on its own clock. Both are places where
 * standing still is a decision, which is the one thing a pit cannot ask.
 *
 * Nine traps became twenty-three.
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
    traps: [
      // TWO BEATS ON THE WAY UP, and the sector opener had none at all: five
      // identical steps, every one inside the jump arc, nothing to read once
      // the player worked out that the reach was enough. That is the version
      // the owner played — «сектор 9 тоже слишком лёгкий, мало ловушек».
      // Removing the floor is the sector's idea, but an idea is not a
      // question, and a staircase over a void is still a staircase.
      //
      // Both of these cross a gap rather than stand on a ledge. That is the
      // rule the whole sector is rebuilt under: over a pit the fall already
      // costs the attempt, so a hazard sitting on a step would only make the
      // step lethal twice. What a void sector can ask is WHEN you leave.
      { type: 'laser', id: 'laser-01', col: 16, topRow: 16, bottomRow: 21 },
      {
        type: 'moving-spike',
        id: 'mspike-01',
        fromCol: 28,
        fromRow: 12,
        toCol: 28,
        toRow: 16,
        travelMs: 1500,
      },
    ],
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
    traps: [
      // THE LONGEST JUMPS IN THE GAME, NOW ON A CLOCK. Two-tile steps already
      // punish a bad landing; what they did not ask was when to go. Each of
      // these three sits in a gap the player must cross, never over a ledge
      // they must stand on, so the answer is always "wait, then jump" and
      // never "you were standing in the wrong place".
      { type: 'laser', id: 'laser-01', col: 19, topRow: 17, bottomRow: 22 },
      {
        type: 'moving-spike',
        id: 'mspike-01',
        fromCol: 25,
        // Its lowest point stays clear of a standing player's hurt box over
        // the ground row (`level-def-sanity` measures that against the whole
        // width, gaps included, and being strict about it here costs
        // nothing — clearance has to be one tile or a whole hurt box plus
        // one, never in between): the arc off the row-20 step peaks near
        // row 17, so the patrol still crosses the jump at its lowest point
        // without ever being a wall to walk into.
        fromRow: 13,
        toCol: 25,
        toRow: 17,
        travelMs: 1300,
      },
      { type: 'laser', id: 'laser-02', col: 38, topRow: 10, bottomRow: 15, initialIdleMs: 600 },
    ],
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
      // A BEAM BEFORE EACH VANISHING STEP, and that order is the whole point.
      // On its own, a step that will not last asks only for nerve: go now.
      // A beam in front of it asks for the opposite — wait — and the level
      // becomes the two answers colliding, which is what sectors 02 and 03
      // spent twelve levels teaching separately. The beams are offset against
      // each other so the two halves of the climb never rhyme.
      { type: 'laser', id: 'laser-01', col: 11, topRow: 17, bottomRow: 22 },
      { type: 'laser', id: 'laser-02', col: 23, topRow: 13, bottomRow: 18, initialIdleMs: 700 },
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
      { type: 'conveyor', id: 'belt-01', col: 14, row: 19, width: 5, speed: 72 },
      { type: 'conveyor', id: 'belt-02', col: 28, row: 15, width: 5, speed: -60 },
      // ON THE BELT, NOT BESIDE IT, and ONE TILE WIDE IN THE MIDDLE OF IT.
      // The belt is carrying the player toward this on its own, which is
      // what a pit cannot do: threaten somebody who is standing still in a
      // place that is not falling.
      //
      // BOTH NUMBERS WERE MEASURED, AND THE FIRST DRAFT FAILED. It was two
      // tiles wide at columns 17-18 — the far end of the belt, which is
      // exactly the take-off tile for the required jump to the row-17 tier.
      // A hazard standing on the only place a jump can start is not a
      // question, it is a toll booth (CLAUDE.md #4.7's placement rule, and
      // the same mistake sector 05's false door had to be repaired of), and
      // the only escape was walking back against a 72 px/s belt at a net
      // 38 px/s: 530 ms to clear two tiles against a 600 ms telegraph.
      //
      // At column 16, one tile, the take-off is clean and the escape is one
      // tile in either direction: ~100 ms going with the belt, ~260 ms
      // against it, both comfortably inside the warning. A spike that rises
      // through the belt cannot be jumped — it ends a row ABOVE the floor it
      // comes through — so horizontal room is the whole of the answer, and
      // the level has to be built to hand it over.
      {
        type: 'spike-bank',
        id: 'sbank-01',
        col: 16,
        width: 1,
        hiddenRow: 20,
        lethalRow: 18,
        timing: { idleMs: 1400, warningMs: 700, activeMs: 700, cooldownMs: 300 },
      },
      // Across the last jump, off the second belt onto the exit tier.
      { type: 'laser', id: 'laser-01', col: 33, topRow: 11, bottomRow: 16 },
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
      // HOLD FIRE'S QUESTION, ASKED WHERE THERE IS NOTHING TO LAND ON.
      // Hung over the second pad, so the player standing on it has to decide
      // whether this launch is the one — and stepping off means stepping off
      // a ledge in a sector with no floor, which is the trade sector 07 made
      // over solid ground and this one makes over the pit.
      //
      // `warningMs` IS 1200 AND IS DERIVED, NOT CHOSEN. The launch clause of
      // CLAUDE.md #4.5 requires the telegraph to outlast the flight through
      // the band plus 300 ms of reaction, because `Player.launch` fixes the
      // arc at the moment of firing and the only defence is leaving early.
      // `tests/launch-window.test.ts` computes the floor from the physics
      // and rejects anything under it.
      {
        type: 'spike-bank',
        id: 'sbank-01',
        col: 15,
        width: 3,
        hiddenRow: 12,
        lethalRow: 15,
        timing: { idleMs: 1600, warningMs: 1200, activeMs: 1000, cooldownMs: 500 },
      },
      // And a beam across the last hop, onto the exit tier.
      { type: 'laser', id: 'laser-01', col: 25, topRow: 7, bottomRow: 12 },
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
      { type: 'conveyor', id: 'belt-01', col: 14, row: 19, width: 5, speed: -55 },
      { type: 'disappearing-platform', id: 'dp-01', col: 28, row: 15, width: 3 },
      { type: 'launch-pad', id: 'pad-01', col: 34, row: 15, width: 3, liftTiles: 7 },
      // AND ONE OF EACH KIND OF CLOCK ON TOP OF ONE OF EACH KIND OF STEP.
      // The three above are the sector's own vocabulary; these three are
      // what the rest of the campaign puts between them. The closing level
      // of a sector is the only place in the game where the player is
      // allowed to be asked everything at once, and this one was asking
      // three things where sector 05's closer asked seven.
      { type: 'laser', id: 'laser-01', col: 19, topRow: 15, bottomRow: 21 },
      {
        type: 'moving-spike',
        id: 'mspike-01',
        fromCol: 26,
        fromRow: 11,
        toCol: 26,
        toRow: 16,
        travelMs: 1400,
      },
      // ON THE LAST WALK TO THE DOOR. It was at column 38 — past the pad,
      // past the row-10 tier, past everything, hanging in open sky where
      // the player never goes. `routeTrace` found it the day it was
      // written, which is the entire reason that module exists: the same
      // mistake had just shipped three tiles from the exit of `TERMINAL`
      // and only the owner's eye caught it.
      //
      // Column 28 is on the row-7 tier, between where the last hop lands
      // (29) and the door (26), and off the exit column itself.
      { type: 'laser', id: 'laser-02', col: 28, topRow: 3, bottomRow: 8, initialIdleMs: 900 },
    ],
  },
];
