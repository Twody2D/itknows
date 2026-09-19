import type { LevelDef } from '@/gameplay/LevelDef';
import { dropSpike } from './ambush';

/**
 * SECTOR 06 — OVERCLOCK. Что тебя убивало, теперь тебя несёт.
 *
 * The first sector past the original campaign, and the first one built on
 * something that is not an obstacle. Every trap in sectors 01-05 asks the
 * same question in a different accent — can you get past me. The launch pad
 * (`traps/LaunchPadTrap.ts`) asks the opposite one: will you stand on me and
 * wait, knowing what standing still has cost you for five sectors.
 *
 *   01 LIFT-OFF  — the top half of the screen is simply out of reach
 *   02 WINDOW    — the pad puts you somewhere, the beams decide when
 *   03 CHAIN     — a pad throws you onto a pad
 *   04 CROSSING  — the same throw read sideways: air time as distance
 *   05 HOLD      — the wait, with something behind you charging for it
 *   06 OVERCLOCK — floor to ceiling, three launches, everything learned
 *
 * WHY THE UPPER HALF IS OUT OF JUMP RANGE ON PURPOSE. A jump rises 3.47
 * tiles (`jumpPhysics.MAX_JUMP_RISE_PX`); every tier reached by a pad here
 * sits four or five above its take-off. That is the sector's honesty
 * argument: if a pad were a shortcut over geometry the player could climb
 * anyway, it would be an optional toy and the levels would be about
 * something else. `LevelValidator` knows the lift and proves every route, so
 * "out of reach" never means "out of reach of the solver too".
 *
 * WHY EVERY PAD LOOPS. A `loop: false` pad fires once, on a trigger, and the
 * solver refuses to count its lift at all (`LevelValidator.platformSegments`)
 * — a route through a launch that may never come is a dead end with a
 * certificate. Every pad here cycles forever, so a missed launch costs the
 * wait and nothing else (CLAUDE.md #4.4).
 *
 * NO FAKE EXIT IN THE SECTOR. The cap is one per sector (CLAUDE.md #4.7) and
 * this one spends nothing on it: the pad is already something the player has
 * to decide to trust, and two of those in one sector is one too many.
 */
export const SECTOR_06_LEVELS: LevelDef[] = [
  {
    id: 'sector-06-level-01',
    name: 'LIFT-OFF',
    width: 48,
    groundRow: 22,
    gaps: [],
    // Between the spawn and the pad, so the walk over is not just a walk:
    // the level's first input is an ordinary jump, which is exactly the move
    // it is about to tell the player is not enough.
    spikeColumns: [8, 9],
    platforms: [
      { col: 16, row: 17, width: 10 },
      { col: 27, row: 14, width: 7 },
    ],
    playerStartCol: 3,
    exitCol: 30,
    exitRow: 14,
    traps: [
      // FIVE TILES UP, against a jump of 3.47. Nothing else in the level
      // reaches row 17 and nothing is meant to: the pad is the only door,
      // and the player can see that from the spawn tile without moving.
      { type: 'launch-pad', id: 'pad-01', col: 12, row: 22, width: 3, liftTiles: 6 },
    ],
  },
  {
    id: 'sector-06-level-02',
    name: 'WINDOW',
    width: 48,
    groundRow: 22,
    gaps: [],
    spikeColumns: [5, 6],
    platforms: [
      { col: 13, row: 17, width: 10 },
      { col: 26, row: 14, width: 8 },
    ],
    playerStartCol: 2,
    exitCol: 30,
    exitRow: 14,
    traps: [
      // The beam stands between the spawn and the pad: the pad's cycle is
      // not the only clock in the level, and arriving late means waiting out
      // a whole launch cycle standing on the machine. Two rhythms, both on
      // screen, neither hidden behind the other.
      { type: 'laser', id: 'laser-01', col: 9, topRow: 17, bottomRow: 21 },
      { type: 'launch-pad', id: 'pad-01', col: 12, row: 22, width: 3, liftTiles: 6 },
      // And the same question again after the landing, on a tier where the
      // only answer is to stand still — the thing sector 05 spent six levels
      // making expensive.
      { type: 'laser', id: 'laser-02', col: 19, topRow: 12, bottomRow: 16, initialIdleMs: 700 },
    ],
  },
  {
    id: 'sector-06-level-03',
    name: 'CHAIN',
    width: 48,
    groundRow: 22,
    // Under the climb, so a launch taken from the wrong tile is paid for
    // properly. Wider than a jump from either lip on purpose: there is no
    // walking out of it, and the restart is one tap (CLAUDE.md #4.4).
    gaps: [[20, 26]],
    spikeColumns: [],
    platforms: [
      // The first tier is a platform, a pad, a platform, laid end to end so
      // it reads as one ledge with machinery in the middle rather than as
      // three separate things to land on.
      { col: 10, row: 18, width: 2 },
      { col: 15, row: 18, width: 2 },
      { col: 17, row: 13, width: 8 },
      { col: 28, row: 10, width: 7 },
    ],
    playerStartCol: 2,
    exitCol: 30,
    exitRow: 10,
    traps: [
      { type: 'launch-pad', id: 'pad-01', col: 5, row: 22, width: 3, liftTiles: 5 },
      // ON A PLATFORM, not on the ground — the first pad in the campaign the
      // player has to be delivered to before they can use it.
      { type: 'launch-pad', id: 'pad-02', col: 12, row: 18, width: 3, liftTiles: 6 },
    ],
  },
  {
    id: 'sector-06-level-04',
    name: 'CROSSING',
    width: 48,
    groundRow: 22,
    // Seven tiles: 70px between the lips against 57.9px of jump
    // (`REACH_AT_SAME_HEIGHT_PX`). Not close — there is no version of the
    // jump that clears this, which is what makes the pad the crossing rather
    // than a faster way of doing one.
    gaps: [[14, 20]],
    spikeColumns: [8, 9],
    platforms: [
      // THE LANDING, hung over the far half of the pit and three tiles up.
      //
      // The first draft had no ledge at all and asked the launch to carry
      // the player the whole seven tiles onto the ground on the other side.
      // The solver signed that off — 70px of gap against 79px of reach — and
      // playing it showed what those nine pixels are worth: launched from
      // the middle of the pad instead of its right-hand tile, the android
      // came down in the pit. A crossing whose margin is smaller than where
      // the player happened to be standing is not a crossing, it is a
      // coin-flip with a certificate. The ledge turns the same throw into
      // 50px of gap against 68px of reach, and it is still far past what a
      // jump can do (40.6px at this height), so the pad is no less
      // mandatory than it was.
      { col: 19, row: 19, width: 6 },
      { col: 31, row: 19, width: 6 },
      { col: 38, row: 16, width: 7 },
    ],
    playerStartCol: 2,
    exitCol: 41,
    exitRow: 16,
    traps: [
      // THE SAME THROW, READ SIDEWAYS. Every other level in the sector
      // spends the lift on height; here the height is incidental and what
      // the player buys is air time, which at 110px/s is distance
      // (`jumpPhysics.launchReach`). Eight tiles up, and the pad is a bridge.
      //
      // Eight and not seven, which is the second thing playing this level
      // changed. At seven the throw covered 68px against the 61 the crossing
      // needs from the middle of the pad — and the four pixels left over
      // after a tenth of a second of reaction time were not enough: the
      // android went into the pit. The margin is a level-design number, not
      // a physics one, and it should not be readable as "close".
      { type: 'launch-pad', id: 'pad-01', col: 11, row: 22, width: 3, liftTiles: 8 },
      // On the far side, where the landing is: the crossing is not over at
      // the moment the player is above the pit.
      { type: 'spike-bank', id: 'sbank-01', col: 26, width: 3, hiddenRow: 23, lethalRow: 21 },
    ],
  },
  {
    id: 'sector-06-level-05',
    name: 'HOLD',
    width: 48,
    groundRow: 22,
    gaps: [],
    spikeColumns: [14, 15],
    platforms: [
      { col: 22, row: 18, width: 9 },
      { col: 33, row: 15, width: 8 },
    ],
    playerStartCol: 4,
    exitCol: 36,
    exitRow: 15,
    traps: [
      // SECTOR 05'S ARGUMENT AGAINST SECTOR 06'S. The pursuer exists to make
      // standing still cost something; the pad cannot be used without
      // standing still. The level is that collision, and it stays affordable
      // by construction: at 0.65 the drone is slower than the player, so a
      // launch cycle can be waited out by anyone who did not dawdle on the
      // way over (CLAUDE.md #13).
      { type: 'pursuer', id: 'pursuer-01', col: 1, row: 21, speedFactor: 0.65 },
      { type: 'launch-pad', id: 'pad-01', col: 18, row: 22, width: 3, liftTiles: 5 },
      // Above the landing tier, so the pressure does not end with the
      // launch: the beam is the second wait, and the drone does not stop at
      // the bottom of the climb.
      { type: 'laser', id: 'laser-01', col: 28, topRow: 13, bottomRow: 17 },
    ],
  },
  {
    id: 'sector-06-level-06',
    name: 'OVERCLOCK',
    width: 48,
    groundRow: 22,
    gaps: [[26, 31]],
    spikeColumns: [5, 6],
    platforms: [
      { col: 15, row: 17, width: 4 },
      { col: 24, row: 12, width: 8 },
      { col: 35, row: 9, width: 7 },
      // The roof, offset LEFT of the pad that reaches it. Straight above
      // would have worked and would have asked nothing: the last launch in
      // the sector is the one place worth making the player aim, and every
      // throw before it drifted right. The exit is plainly visible up and to
      // the left from the ledge below, so the aim is a decision, not a
      // guess.
      { col: 30, row: 5, width: 8 },
    ],
    playerStartCol: 2,
    exitCol: 33,
    exitRow: 5,
    traps: [
      ...dropSpike('dspike-01', 10, 21, 22),
      { type: 'launch-pad', id: 'pad-01', col: 11, row: 22, width: 3, liftTiles: 6 },
      // OFFSET FROM THE ONE BELOW, and that is the whole repair here. Both
      // pads started out on columns 19-21, one directly above the other:
      // played, the first launch went straight past the tier it was supposed
      // to land on, touched down on the second pad and was thrown again
      // before the player had done anything — two launches for one decision,
      // and the row-17 ledge might as well not have existed. Four columns
      // apart, the tier is landed on, walked across and left from, which is
      // what the level is for.
      { type: 'launch-pad', id: 'pad-02', col: 19, row: 17, width: 3, liftTiles: 6 },
      // Three tiles of ledge with a pad on them — the last launch is taken
      // from the narrowest footing in the sector, and it goes to the roof.
      { type: 'launch-pad', id: 'pad-03', col: 38, row: 9, width: 3, liftTiles: 5 },
      // In the open air over the row-12 → row-9 hop, clear of both landings
      // — the placement rule sector 05's finale had to be repaired into
      // (`sector05.ts`, `orbit-01`): the arc may cross the flight, never the
      // ledge the player waits on.
      { type: 'orbit-spike', id: 'orbit-01', pivotCol: 33, pivotRow: 11, radiusTiles: 1.25, periodMs: 1800 },
    ],
  },
];
