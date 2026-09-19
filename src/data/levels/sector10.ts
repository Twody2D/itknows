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
 * REBUILT 2026-09-19, AND THE TWO HALVES OF THE COMPLAINT NEEDED DIFFERENT
 * REPAIRS. The owner played the finished campaign and said of the finale
 * «тоже слишком лёгкий и непонятный».
 *
 * The first half was arithmetic: sixteen traps where sector 04 runs at
 * twenty-two. A retrospective thinner than what it remembers is not a
 * summary, it is an epilogue. Thirty now, and no stretch of any level is a
 * walk — the additions follow whichever sector the level is citing, which is
 * why VOID's three all sit in gaps (sector 09's rule: over a pit the fall
 * already costs the attempt) and MACHINE's both stay clear of the pad's
 * columns (sector 07's: the launch clause is paid once, by the bank).
 *
 * THE SECOND HALF WAS NOT FIXABLE HERE AT ALL, and that is worth writing
 * down. The retrospective below is real, it is in this file, and a player
 * has no way whatever to perceive it: by level fifty-five everything is
 * familiar, so a citation you cannot name is just another corridor.
 * Geometry can say what to do; it can never say why this screen differs from
 * the last fifty. That is what SYSTEM has been for since sector 01, and it
 * had never been asked — the level map's line was chosen from how many
 * levels were cleared and said nothing about which sector they were in. So
 * every sector now states its own premise once, on the map, while it is
 * still untouched (`data/dialogues/levelSelect.ts`), and this one says out
 * loud what the six levels below are doing.
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
      // ON THE LIP OF THE PIT, so crossing it is a decision and not a
      // formality. Added 2026-09-19 with the rest of the sector: the finale
      // ran at sixteen traps where sector 04 ran at twenty-two, and a
      // retrospective that is thinner than what it remembers is not a
      // summary, it is an epilogue.
      {
        type: 'spike-bank',
        id: 'sbank-02',
        col: 21,
        width: 2,
        hiddenRow: 23,
        lethalRow: 21,
        timing: { idleMs: 1600, warningMs: 500, activeMs: 600, cooldownMs: 400 },
      },
      // And on the tier past the beam, so the climb is not a reward.
      { type: 'laser', id: 'laser-02', col: 35, topRow: 15, bottomRow: 18, initialIdleMs: 600 },
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
      // BETWEEN THE TWO BEAMS, where the level used to hand out a free
      // breath. The drone is behind, both beams are ahead, and the ground
      // between them was the one place the player could stop thinking — on
      // a level whose whole name is the argument that stopping costs.
      {
        type: 'spike-bank',
        id: 'sbank-01',
        col: 22,
        width: 2,
        hiddenRow: 23,
        lethalRow: 21,
        timing: { idleMs: 1500, warningMs: 500, activeMs: 600, cooldownMs: 400 },
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
      // THREE CLOCKS ON THE ROUTE THAT WORKS, and none on the walk to the
      // door that does not. That asymmetry is deliberate: the false exit is
      // already a cost, and taxing the detour as well would turn a question
      // into a punishment for having asked it.
      { type: 'laser', id: 'laser-01', col: 14, topRow: 17, bottomRow: 21 },
      {
        type: 'spike-bank',
        id: 'sbank-01',
        col: 26,
        width: 2,
        hiddenRow: 17,
        lethalRow: 15,
        timing: { idleMs: 1700, warningMs: 500, activeMs: 600, cooldownMs: 400 },
      },
      { type: 'laser', id: 'laser-02', col: 30, topRow: 12, bottomRow: 15, initialIdleMs: 700 },
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
      { type: 'conveyor', id: 'belt-01', col: 10, row: 22, width: 6, speed: 70 },
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
      // WHERE THE THROW PUTS YOU, AND WHERE IT LEAVES YOU. The belt, the pad
      // and the bank were three machines that all finished at the same
      // moment; these two carry the level past it. Both clear of the pad's
      // columns — the launch clause (CLAUDE.md #4.5) is paid once, by the
      // bank, and once is enough.
      { type: 'laser', id: 'laser-01', col: 25, topRow: 13, bottomRow: 16 },
      { type: 'laser', id: 'laser-02', col: 30, topRow: 12, bottomRow: 16, initialIdleMs: 800 },
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
      { type: 'conveyor', id: 'belt-01', col: 14, row: 19, width: 5, speed: -55 },
      { type: 'launch-pad', id: 'pad-01', col: 28, row: 17, width: 3, liftTiles: 7 },
      // SECTOR 09'S RULE, SINCE THIS LEVEL IS SECTOR 09: over a pit the fall
      // already costs the attempt, so nothing here stands on a ledge. All
      // three sit in gaps the player crosses — they ask when to leave, and
      // the void answers for everything else.
      { type: 'laser', id: 'laser-01', col: 12, topRow: 17, bottomRow: 21 },
      { type: 'laser', id: 'laser-02', col: 20, topRow: 15, bottomRow: 19, initialIdleMs: 600 },
      {
        type: 'moving-spike',
        id: 'mspike-01',
        fromCol: 26,
        fromRow: 13,
        toCol: 26,
        toRow: 17,
        travelMs: 1400,
      },
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
      { type: 'conveyor', id: 'belt-01', col: 13, row: 22, width: 5, speed: 70 },
      { type: 'launch-pad', id: 'pad-01', col: 19, row: 22, width: 3, liftTiles: 7 },
      { type: 'disappearing-platform', id: 'dp-01', col: 29, row: 13, width: 3 },
      // Across the last hop of the campaign, and off to the side of every
      // ledge it borders — the arc crosses it, the landings do not.
      { type: 'laser', id: 'laser-01', col: 33, topRow: 5, bottomRow: 9 },
      // THE DENSEST SCREEN IN THE GAME, and it is the last one. Everything
      // above is the vocabulary; these three are the sector's own argument
      // made literal — there is no stretch of this climb, from the spawn
      // tile to the door, where nothing is asked.
      {
        type: 'spike-bank',
        id: 'sbank-01',
        col: 8,
        width: 2,
        hiddenRow: 23,
        lethalRow: 21,
        timing: { idleMs: 1400, warningMs: 500, activeMs: 600, cooldownMs: 400 },
      },
      { type: 'laser', id: 'laser-02', col: 24, topRow: 12, bottomRow: 15 },
      // A PATROLLING SPIKE STOOD AT COLUMN 34 HERE AND WAS REMOVED THE SAME
      // DAY IT WAS ADDED. The owner saw it first — «бесполезный шип у
      // портала» — and the arithmetic agrees exactly. The hop off the
      // vanishing step leaves column 31 at row 13 and lands on the row-10
      // tier; three tiles later the android is at its apex, feet at y=95 and
      // hurt box from y=63. The spike ran rows 11 to 15, which is y=110 to
      // y=160. Fifteen pixels of clear air, every single launch.
      //
      // WHAT THIS COSTS BEYOND NOTHING. A hazard that cannot touch the
      // player is not neutral in a game whose whole contract is that what is
      // on screen is what is true: it teaches the player to route around
      // something that was never there, and the next spike they believe is
      // decoration will be the one that kills them.
      //
      // The other four patrols added this round were checked by the same
      // calculation rather than by eye, and all four do intersect the arc
      // they guard: FIRST STEP at column 28 (11 px of overlap), NARROW at 25
      // (32), SCAFFOLD at 26 (29), VOID at 26 (9). VOID's is the thin one and
      // it is thin on purpose — it grazes the top of a flat jump.
      //
      // A spike at row 9 or 10 WOULD have caught this arc, and it is not
      // there for a reason: column 34 is the lip of the landing ledge, so a
      // hazard high enough to matter is a hazard standing on the only tile
      // the jump can end on. That is the toll booth CONVEY had to be
      // repaired of earlier today. Better nothing than a wall.
    ],
  },
];
