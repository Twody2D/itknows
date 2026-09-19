import type { LevelDef } from '@/gameplay/LevelDef';

/**
 * SECTOR 08 — SORTING FLOOR. Стоять на месте больше нельзя.
 *
 * The campaign's second new mechanic (`traps/ConveyorTrap.ts`), and the one
 * that argues with every sector before it. Sectors 02-05 taught when to
 * wait and where it is safe to do it; 06 and 07 made waiting the price of
 * being carried. All of that assumed a floor that stays under you. Here the
 * floor is machinery: it pulls, it never stops, and the safe tile slides out
 * from underneath while you are busy reading the trap above it.
 *
 *   01 DRIFT         — the floor takes you somewhere you did not choose
 *   02 UPSTREAM      — wait out the beam while being pushed away from it
 *   03 SORTED        — where you land decides which way you are sent
 *   04 FEED          — the belt hands you to the thing on a clock
 *   05 RELOAD        — a pad needs you still, a belt will not let you be
 *   06 SORTING FLOOR — all of it, floor to roof
 *
 * WHY THE BELT NEVER KILLS AND NEVER WARNS. It has no phase cycle at all:
 * it is solid, standable, and running at the same speed forever, with its
 * chevrons scrolling at exactly the rate it pulls. CLAUDE.md #4.2 governs
 * things that turn lethal; a conveyor never does. What kills is whatever the
 * belt hands you to — a pit, a beam, a plate — and every one of those keeps
 * its own telegraph.
 *
 * WHY IT IS CAPPED AT 60 AGAINST THE PLAYER'S 110. Walking upstream has to
 * stay possible. `LevelValidator` counts a conveyor as ordinary footing, so
 * a belt the player could not walk against would be a wall the solver cannot
 * see — the same rule that keeps the pursuer slower than the player
 * (CLAUDE.md #13), applied to the ground itself.
 */
export const SECTOR_08_LEVELS: LevelDef[] = [
  {
    id: 'sector-08-level-01',
    name: 'DRIFT',
    width: 48,
    groundRow: 22,
    // The belt ends at the lip. Standing still anywhere on it is a decision
    // to go into the pit, which is the entire lesson and costs one attempt.
    gaps: [[18, 22]],
    spikeColumns: [6, 7],
    platforms: [
      { col: 28, row: 19, width: 6 },
      { col: 36, row: 16, width: 6 },
    ],
    playerStartCol: 2,
    exitCol: 38,
    exitRow: 16,
    traps: [
      // Toward the hole, at 45 against the player's 110 — slow enough to walk
      // out of, fast enough that doing nothing is an answer with a cost.
      { type: 'conveyor', id: 'belt-01', col: 12, row: 22, width: 6, speed: 45 },
    ],
  },
  {
    id: 'sector-08-level-02',
    name: 'UPSTREAM',
    width: 48,
    groundRow: 22,
    gaps: [],
    spikeColumns: [5, 6],
    platforms: [
      { col: 28, row: 19, width: 6 },
      { col: 36, row: 16, width: 7 },
    ],
    playerStartCol: 2,
    exitCol: 38,
    exitRow: 16,
    traps: [
      // SECTOR 05'S ARGUMENT, REBUILT OUT OF THE FLOOR. The pursuer made
      // waiting cost distance by chasing; this costs the same distance with
      // nothing chasing at all — stand still in front of the beam and the
      // ground quietly returns you to where you started. Walking on the spot
      // is a real action here, and it is the level's whole verb.
      { type: 'conveyor', id: 'belt-01', col: 10, row: 22, width: 15, speed: -50 },
      { type: 'laser', id: 'laser-01', col: 20, topRow: 17, bottomRow: 21 },
    ],
  },
  {
    id: 'sector-08-level-03',
    name: 'SORTED',
    width: 48,
    groundRow: 22,
    gaps: [],
    spikeColumns: [8, 9],
    platforms: [
      { col: 29, row: 16, width: 6 },
      { col: 36, row: 13, width: 7 },
    ],
    playerStartCol: 2,
    exitCol: 38,
    exitRow: 13,
    traps: [
      // TWO BELTS BACK TO BACK, running away from the seam between them.
      // The tier is three tiles up — an ordinary jump — but where on it the
      // player lands decides which way they are sent, and only the right
      // half leads anywhere. It is the first level in the game whose
      // question is about the second half of a jump rather than the first.
      { type: 'conveyor', id: 'belt-left', col: 14, row: 19, width: 6, speed: -50 },
      { type: 'conveyor', id: 'belt-right', col: 20, row: 19, width: 6, speed: 50 },
    ],
  },
  {
    id: 'sector-08-level-04',
    name: 'FEED',
    width: 48,
    groundRow: 22,
    gaps: [],
    spikeColumns: [6, 7],
    platforms: [
      { col: 34, row: 19, width: 6 },
      { col: 40, row: 16, width: 6 },
    ],
    playerStartCol: 2,
    exitCol: 42,
    exitRow: 16,
    traps: [
      // The belt delivers the player to the plate whether they are ready or
      // not: there is no lip to stand on and read the cycle from, because
      // the lip is moving. The plate is jumpable from its own edge (five
      // tiles against 5.8 of reach) — what the belt takes away is the pause
      // before the jump, not the jump.
      { type: 'conveyor', id: 'belt-01', col: 16, row: 22, width: 11, speed: 50 },
      {
        type: 'electric-floor',
        id: 'ef-01',
        col: 27,
        width: 5,
        row: 22,
        timing: { idleMs: 2200, warningMs: 550, activeMs: 600, cooldownMs: 300 },
      },
    ],
  },
  {
    id: 'sector-08-level-05',
    name: 'RELOAD',
    width: 48,
    groundRow: 22,
    gaps: [],
    spikeColumns: [5, 6],
    platforms: [
      { col: 25, row: 17, width: 8 },
      { col: 35, row: 14, width: 7 },
    ],
    playerStartCol: 2,
    exitCol: 37,
    exitRow: 14,
    traps: [
      // THE COLLISION THE WHOLE SECTOR WAS BUILT FOR. Sector 06's pad only
      // works if you stand on it; this one is a two-tile island between two
      // belts that both run right, so arriving is easy, staying is not, and
      // overshooting puts you on the outbound belt with a cycle to walk back
      // against. Standing still has been the answer since sector 03 — this
      // is the level where it has to be earned every second.
      { type: 'conveyor', id: 'belt-in', col: 15, row: 22, width: 6, speed: 40 },
      { type: 'launch-pad', id: 'pad-01', col: 21, row: 22, width: 2, liftTiles: 6 },
      { type: 'conveyor', id: 'belt-out', col: 23, row: 22, width: 6, speed: 40 },
    ],
  },
  {
    id: 'sector-08-level-06',
    name: 'SORTING FLOOR',
    width: 48,
    groundRow: 22,
    gaps: [[20, 25]],
    spikeColumns: [4, 5],
    platforms: [
      { col: 20, row: 15, width: 2 },
      { col: 27, row: 15, width: 2 },
      { col: 31, row: 12, width: 2 },
      { col: 37, row: 12, width: 2 },
      { col: 24, row: 9, width: 7 },
      { col: 33, row: 6, width: 8 },
    ],
    playerStartCol: 2,
    exitCol: 35,
    exitRow: 6,
    traps: [
      { type: 'conveyor', id: 'belt-ground', col: 8, row: 22, width: 7, speed: 45 },
      { type: 'launch-pad', id: 'pad-01', col: 16, row: 22, width: 3, liftTiles: 8 },
      // Every tier above is part belt, part plain ledge, and the belts all
      // run AWAY from the next hop. The climb is the same shape as sector
      // 06's, and every landing on it is now a place you cannot simply stand.
      { type: 'conveyor', id: 'belt-a', col: 22, row: 15, width: 5, speed: -45 },
      { type: 'conveyor', id: 'belt-b', col: 33, row: 12, width: 4, speed: 45 },
    ],
  },
];
