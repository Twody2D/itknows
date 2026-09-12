import type { LevelDef } from '@/gameplay/LevelDef';

/**
 * SECTOR 04 — DATA DISTRICT. What you are looking at is not what is there.
 *
 * Three sectors have now taught the player to read a level from the spawn
 * point and trust what they read. This one charges for that trust: a ledge
 * that is not solid, a floor that is only sometimes lethal, a spike whose
 * return trip comes from the wrong side, and — last — the ambush from the
 * very first level of the game, now used on purpose and more than once.
 *
 *   01 GHOST FLOOR — the ledge that is not there
 *   02 CURRENT     — the floor that is only sometimes lethal
 *   03 CIRCUIT     — a spike that never comes back the way it left
 *   04 AMBUSH      — the level-one surprise, three times, with the rules known
 *   05 PRESS       — machines above a ladder that will not wait
 *   06 DISTRICT    — all of it
 *
 * FAKE PLATFORMS ARE DECOYS, NEVER THE ROUTE. A `fake-platform` always sits
 * beside a real path, never on it, and never over anything that kills —
 * taking the bait costs the climb and nothing else. That is the rule
 * CLAUDE.md #4.7 sets for the fake exit ("первое появление в игре не
 * смертельно"), applied to the thing it is really about: the player has to
 * be able to learn what a fake looks like by being wrong once, cheaply.
 * `LevelValidator` never counts one as a surface, so a level that needed one
 * to be solvable would be reported unsolvable.
 */

/** The ambush spike's honest cycle — identical to sector 01's, since it is the same device. */
const AMBUSH_TIMING = { idleMs: 900, warningMs: 500, activeMs: 300, cooldownMs: 250 } as const;

/** Columns between an ambush trigger's left edge and its spike's column — `moveSpeed × warningMs` from the trigger's centre (see `sector01.ts`). */
const AMBUSH_TRIGGER_LEAD = 6;

/** Sector 01's trapdoor contract, unchanged — see `sector01.ts` for why these two numbers are what they are. */
const TRAPDOOR_WARN_MS = 350;
const TRAPDOOR_LEAD = 4;

export const SECTOR_04_LEVELS: LevelDef[] = [
  {
    id: 'sector-04-level-01',
    name: 'GHOST FLOOR',
    width: 48,
    groundRow: 22,
    // The run-up restates the sector's thesis in the one language the
    // player already speaks fluently after sector 01: a trapdoor, on flat
    // ground, before anything else happens. Every fake above it is the same
    // sentence said about a ledge instead of a floor.
    gaps: [[12, 14]],
    spikeColumns: [],
    // The climb turns back on itself at the top for the same reason sector
    // 01's does: a straight staircase at this pitch parks the exit in the
    // top-right corner behind the pause button. Folding it inwards also
    // puts the last fake directly overhead at the moment the real route
    // asks the player to go left, which is the best version of this level's
    // question.
    platforms: [
      { col: 17, row: 19, width: 4 },
      { col: 21, row: 16, width: 4 },
      { col: 28, row: 13, width: 4 },
      { col: 21, row: 10, width: 4 },
      { col: 28, row: 7, width: 4 },
    ],
    playerStartCol: 2,
    exitCol: 29,
    exitRow: 7,
    traps: [
      { type: 'falling-platform', id: 'flp-01', col: 12, row: 22, width: 3, armed: true, warnMs: TRAPDOOR_WARN_MS },
      {
        type: 'trigger',
        id: 'flp-01-trigger',
        col: 12 - TRAPDOOR_LEAD,
        row: 19,
        width: TRAPDOOR_LEAD,
        height: 3,
        targetId: 'flp-01',
      },
      // Each fake sits one hop further right than the real tier at the same
      // height — the tempting shortcut, every time. Ordinary ground is under
      // all three, so the first lesson costs a climb; by the third the
      // player is reading the tiles instead of trusting them.
      { type: 'fake-platform', id: 'fakep-01', col: 28, row: 16, width: 4 },
      { type: 'fake-platform', id: 'fakep-02', col: 35, row: 13, width: 4 },
      { type: 'fake-platform', id: 'fakep-03', col: 28, row: 10, width: 4 },
    ],
  },
  {
    id: 'sector-04-level-02',
    name: 'CURRENT',
    width: 48,
    groundRow: 22,
    gaps: [],
    spikeColumns: [22, 23],
    platforms: [],
    playerStartCol: 2,
    exitCol: 43,
    traps: [
      // Two live plates with a spike pair marooned between them: the safe
      // ground in the middle is real but small, so crossing is two
      // decisions rather than one long dash. A floor that looks identical
      // whether or not it will kill you in half a second is the sector's
      // thesis stated plainly.
      { type: 'electric-floor', id: 'ef-01', col: 13, width: 6, row: 22 },
      { type: 'electric-floor', id: 'ef-02', col: 27, width: 6, row: 22 },
      { type: 'laser', id: 'laser-01', col: 38, topRow: 16, bottomRow: 21 },
    ],
  },
  {
    id: 'sector-04-level-03',
    name: 'CIRCUIT',
    width: 48,
    groundRow: 22,
    gaps: [],
    spikeColumns: [],
    platforms: [
      { col: 12, row: 19, width: 5 },
      { col: 20, row: 16, width: 5 },
      { col: 28, row: 13, width: 6 },
    ],
    playerStartCol: 2,
    exitCol: 30,
    exitRow: 13,
    traps: [
      // A one-way circuit, which is exactly what makes it harder to read
      // than sector 01's patrol. A ping-pong teaches "it comes straight
      // back"; this comes back around the other side, so the safe moment
      // has to be counted rather than felt.
      {
        type: 'loop-spike',
        id: 'loop-01',
        waypoints: [
          { col: 14, row: 17 },
          { col: 20, row: 17 },
          { col: 20, row: 20 },
          { col: 14, row: 20 },
        ],
        travelMs: 1150,
      },
      {
        type: 'loop-spike',
        id: 'loop-02',
        waypoints: [
          { col: 25, row: 14 },
          { col: 31, row: 14 },
          { col: 31, row: 17 },
          { col: 25, row: 17 },
        ],
        travelMs: 1000,
      },
    ],
  },
  {
    id: 'sector-04-level-04',
    name: 'AMBUSH',
    width: 48,
    groundRow: 22,
    // The device from the campaign's first level, brought back where it
    // belongs: by now the player knows a fall means stop, so this is a test
    // of a known rule rather than a surprise. Three of them across one flat
    // run, each trigger the same six columns ahead of its spike, so running
    // through on momentum loses every time and reading the ground wins.
    gaps: [[30, 32]],
    spikeColumns: [],
    platforms: [],
    playerStartCol: 2,
    exitCol: 43,
    traps: [
      {
        type: 'moving-spike',
        id: 'mspike-01',
        ambush: true,
        fromCol: 14,
        fromRow: 11,
        toCol: 14,
        toRow: 21,
        timing: AMBUSH_TIMING,
        loop: false,
      },
      {
        type: 'trigger',
        id: 'mspike-01-trigger',
        col: 14 - AMBUSH_TRIGGER_LEAD,
        row: 19,
        width: 2,
        height: 3,
        targetId: 'mspike-01',
        visible: false,
      },
      {
        type: 'moving-spike',
        id: 'mspike-02',
        ambush: true,
        fromCol: 24,
        fromRow: 11,
        toCol: 24,
        toRow: 21,
        timing: AMBUSH_TIMING,
        loop: false,
      },
      {
        type: 'trigger',
        id: 'mspike-02-trigger',
        col: 24 - AMBUSH_TRIGGER_LEAD,
        row: 19,
        width: 2,
        height: 3,
        targetId: 'mspike-02',
        visible: false,
      },
      // The last one lands immediately after a pit, so stopping dead is not
      // available — the player has to brake *before* the jump they have
      // already committed to. The pit is visible from the spawn, and the
      // trigger sits before it, so the decision is made with everything on
      // screen.
      {
        type: 'moving-spike',
        id: 'mspike-03',
        ambush: true,
        fromCol: 36,
        fromRow: 11,
        toCol: 36,
        toRow: 21,
        timing: AMBUSH_TIMING,
        loop: false,
      },
      {
        type: 'trigger',
        id: 'mspike-03-trigger',
        col: 36 - AMBUSH_TRIGGER_LEAD,
        row: 19,
        width: 2,
        height: 3,
        targetId: 'mspike-03',
        visible: false,
      },
    ],
  },
  {
    id: 'sector-04-level-05',
    name: 'PRESS',
    width: 48,
    groundRow: 22,
    gaps: [],
    spikeColumns: [],
    platforms: [
      { col: 10, row: 19, width: 5 },
      { col: 34, row: 10, width: 6 },
    ],
    playerStartCol: 2,
    exitCol: 36,
    exitRow: 10,
    traps: [
      // A ladder that crumbles under a machine that slams down on it: the
      // tier cannot be waited on and cannot be rushed either, which is the
      // first time the campaign asks for both at once.
      { type: 'disappearing-platform', id: 'dp-01', col: 18, row: 16, width: 4 },
      { type: 'disappearing-platform', id: 'dp-02', col: 26, row: 13, width: 4 },
      {
        type: 'spike-bank',
        id: 'sbank-01',
        col: 19,
        width: 3,
        hiddenRow: 12,
        lethalRow: 15,
        timing: { idleMs: 900, warningMs: 500, activeMs: 300, cooldownMs: 250 },
      },
      {
        type: 'spike-bank',
        id: 'sbank-02',
        col: 27,
        width: 3,
        hiddenRow: 9,
        lethalRow: 12,
        timing: { idleMs: 900, warningMs: 500, activeMs: 300, cooldownMs: 250 },
        initialIdleMs: 850,
      },
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
      // Cross a pit on stones that fall, climb past a ledge that is not
      // there, and do both under a spike that never stops. Nothing new is
      // introduced — the sector's four ideas are simply asked together.
      { type: 'falling-platform', id: 'flp-01', col: 18, row: 19, width: 3 },
      { type: 'falling-platform', id: 'flp-02', col: 24, row: 19, width: 3 },
      { type: 'disappearing-platform', id: 'dp-01', col: 29, row: 16, width: 3 },
      { type: 'fake-platform', id: 'fakep-01', col: 26, row: 13, width: 4 },
      { type: 'orbit-spike', id: 'orbit-01', pivotCol: 33, pivotRow: 16, radiusTiles: 1.75, periodMs: 2000 },
      { type: 'electric-floor', id: 'ef-01', col: 13, width: 4, row: 22 },
    ],
  },
];
