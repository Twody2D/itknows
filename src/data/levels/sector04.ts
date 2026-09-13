import type { LevelDef } from '@/gameplay/LevelDef';
import { dropSpike, floorSpikes, trapdoor } from './ambush';

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

/** Columns between an ambush trigger's left edge and its spike's column — `moveSpeed × warningMs` from the trigger's centre (see `sector01.ts`). */

/** Sector 01's trapdoor contract, unchanged — see `sector01.ts` for why these two numbers are what they are. */

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
      ...trapdoor('flp-01', 12, 3),
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

      ...dropSpike('dspike-01', 31, 21, 22),
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

      ...floorSpikes('sbank-01', 18, 3, 22),
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
      ...dropSpike('mspike-01', 14, 21, 22),
      ...dropSpike('mspike-02', 24, 21, 22),
      // The last one lands immediately after the pit, so stopping dead is
      // not available once the jump is taken — the player has to brake
      // *before* committing to it.
      //
      // Ten columns of lead, not six, and a full second on the ground: at
      // six the spike fell while the player was already two strides from
      // the lip, which is not a decision, and it had retracted again before
      // anyone could land on it. At ten they watch it drop for the whole
      // approach and it is still there when a jump taken on momentum puts
      // them on top of it.
      //
      // Its trigger also used to be a two-column line at 30-31 — inside the
      // pit — so it fired only if a jump arc happened to clip it, and never
      // at all for a player who walked up and stopped. Every ambush in the
      // campaign now uses the shared `approach` band, which is the full
      // lead wide and sits on the floor the player is actually running on.
      ...dropSpike('mspike-03', 34, 21, 22, { lead: 10, activeMs: 1000 }),
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

      ...dropSpike('dspike-01', 12, 21, 22),
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
    gaps: [[19, 29]],
    spikeColumns: [10, 11],
    platforms: [
      // The one slab in the pit that holds, with a falling stone either
      // side of it — same alternating crossing FREEFALL teaches, asked
      // again here with everything else going on at once.
      { col: 22, row: 19, width: 3 },
      { col: 34, row: 19, width: 5 },
      { col: 34, row: 13, width: 6 },
    ],
    playerStartCol: 2,
    exitCol: 36,
    exitRow: 13,
    traps: [

      ...dropSpike('dspike-01', 38, 21, 22),
      // Cross a pit on stones that fall, climb past a ledge that is not
      // there, and do both under a spike that never stops. Nothing new is
      // introduced — the sector's four ideas are simply asked together.
      { type: 'falling-platform', id: 'flp-01', col: 19, row: 19, width: 3 },
      { type: 'falling-platform', id: 'flp-02', col: 26, row: 19, width: 3 },
      { type: 'disappearing-platform', id: 'dp-01', col: 29, row: 16, width: 3 },
      { type: 'fake-platform', id: 'fakep-01', col: 26, row: 13, width: 4 },
      { type: 'orbit-spike', id: 'orbit-01', pivotCol: 33, pivotRow: 16, radiusTiles: 1.75, periodMs: 2000 },
      { type: 'electric-floor', id: 'ef-01', col: 13, width: 4, row: 22 },
    ],
  },
];
