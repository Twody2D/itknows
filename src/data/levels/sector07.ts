import type { LevelDef } from '@/gameplay/LevelDef';

/**
 * SECTOR 07 — REDLINE. Катапульта выстрелит в любом случае.
 *
 * Sector 06 taught the player to accept an offer: stand on the pad, wait,
 * be carried. This one takes the timing of that offer away. The pads here
 * run against hazards on a DIFFERENT period, so the relation between the two
 * drifts: some launches are clean, some throw you into something, and which
 * is which changes from cycle to cycle. Nothing about that is random
 * (CLAUDE.md #4.6) — both clocks are on screen, both are fixed, and the same
 * attempt always plays out the same way.
 *
 * SO THE VERB OF THIS SECTOR IS REFUSAL. The pad announces itself for a full
 * `warningMs` before it fires, and the one thing the player can still do in
 * that window is step off. Sector 06 was about deciding to trust the
 * machine; 07 is about deciding, every single cycle, whether this is the one
 * to trust.
 *
 *   01 HOLD FIRE    — spikes come down through the launch corridor
 *   02 OFFBEAT      — two pads, and only the slow one is always safe
 *   03 GATE         — a barrier that costs the climb, never a life
 *   04 THROUGH      — the beam crosses the arc, and the arc cannot be steered
 *   05 RELAY        — thrown onto something that is itself somewhere else
 *   06 REDLINE      — floor to roof, every refusal in the sector
 *
 * WHAT A BAD LAUNCH COSTS, LEVEL BY LEVEL. On GATE and RELAY it costs only
 * the climb: a shut barrier or a slab that has moved on puts the player back
 * on the ground they left. On HOLD FIRE, OFFBEAT, THROUGH and REDLINE it can
 * kill — and in each of those the hazard is either directly over the pad,
 * where refusing before the throw is the answer, or beside it, where
 * abandoning the crossing in mid-air is. The cheap version comes first in
 * two of the six on purpose: a mechanic whose question is "should I get on
 * this" has to be asked once at a price the player can afford.
 *
 * NOTHING HERE CAN KILL A PLAYER WHO IS MERELY STANDING. Every ceiling bank
 * in the sector stops at row 17, five rows above the floor: the hurt box is
 * 32 px tall from the feet up (`PLAYER_HURT_BOX_HEIGHT`), which reaches row
 * 18.8, so a bank at row 18 clears a standing android by two pixels and one
 * at row 19 does not clear it at all. Two of these were authored at 18 and
 * 19 before that was measured. A trap that kills you for waiting is the
 * exact opposite of a sector about choosing to wait.
 *
 * AND THE PERIODS ARE DELIBERATELY AWKWARD. 3700 and 4100 against the pad's
 * 2300, not 3450 — which looks like an ordinary number and is exactly 1.5
 * pad cycles, so pad and hazard lock into three repeating relations instead
 * of drifting. Twelve launches were sampled on OFFBEAT at 3450 and every one
 * was clean: the bank was decoration, and the level asked nothing.
 *
 * NO NEW TRAP TYPE. The one new mechanic for the back half of the campaign
 * is still owed (sector 08 or 09) — this sector is built entirely out of the
 * collision between sector 06's pad and what sectors 02-05 already taught.
 */
export const SECTOR_07_LEVELS: LevelDef[] = [
  {
    id: 'sector-07-level-01',
    name: 'HOLD FIRE',
    width: 48,
    groundRow: 22,
    gaps: [],
    spikeColumns: [7, 8],
    platforms: [
      { col: 20, row: 17, width: 8 },
      { col: 30, row: 14, width: 7 },
    ],
    playerStartCol: 2,
    exitCol: 32,
    exitRow: 14,
    traps: [
      { type: 'launch-pad', id: 'pad-01', col: 16, row: 22, width: 3, liftTiles: 6 },
      // DIRECTLY OVER THE PAD, and hung from the ceiling so it comes down
      // through the corridor the launch flies up. This is the sector's whole
      // idea in its simplest possible arrangement: the player is standing on
      // the pad, the spikes are either out or in, and the pad says it is
      // about to fire 400 ms before it does.
      //
      // A LONG, SLOW CYCLE (4000 ms against the pad's 2300), so the two never
      // settle into a fixed relation and the answer is different from one
      // launch to the next. `activeMs` is 1200 — the spikes stay down long
      // enough to be an obvious "not this one" rather than a flicker to
      // react to.
      //
      // `warningMs` IS 900 AND IS NOT A STYLE CHOICE. The flight through this
      // band takes about 440 ms, and CLAUDE.md #4.5 wants 300 ms of reaction
      // on top of it: anything shorter and there are launches where this bank's
      // telegraph begins after the player has already been thrown, which is
      // a death nothing on screen could have prevented. The first draft of
      // this sector used 450 and did exactly that on roughly one launch in
      // twenty — found by walking both clocks forward, not by playing.
      // `tests/launch-window.test.ts` now derives the minimum from the
      // physics and refuses anything below it.
      {
        type: 'spike-bank',
        id: 'sbank-01',
        col: 16,
        width: 3,
        hiddenRow: 14,
        lethalRow: 17,
        timing: { idleMs: 1500, warningMs: 900, activeMs: 1200, cooldownMs: 400 },
      },
      // ON THE WALK OVER, NEVER OVER THE PAD. That distinction is what lets
      // this sector be extended at all: a hazard above a pad has to
      // out-telegraph the whole flight through it plus 300 ms, because
      // `Player.launch` fixes the arc at the moment of firing (CLAUDE.md
      // #4.5). Beside the pad, the ordinary 250 ms rule applies and refusing
      // is still free — which is the verb of the entire sector.
      {
        type: 'spike-bank',
        id: 'sbank-02',
        col: 12,
        width: 2,
        hiddenRow: 23,
        lethalRow: 21,
        timing: { idleMs: 1700, warningMs: 500, activeMs: 600, cooldownMs: 400 },
      },
      // And on the tier the launch delivers to: the level was over the
      // moment the throw landed, which is not what a sector about choosing
      // launches should say about the launch it chose.
      { type: 'laser', id: 'laser-01', col: 24, topRow: 13, bottomRow: 16 },
    ],
  },
  {
    id: 'sector-07-level-02',
    name: 'OFFBEAT',
    width: 48,
    groundRow: 22,
    gaps: [],
    spikeColumns: [5, 6],
    platforms: [
      { col: 14, row: 16, width: 8 },
      { col: 28, row: 18, width: 6 },
      { col: 24, row: 15, width: 8 },
      { col: 34, row: 12, width: 7 },
    ],
    playerStartCol: 2,
    exitCol: 36,
    exitRow: 12,
    traps: [
      // THE FAST WAY, and the one under the spikes: straight up to the row-16
      // tier, which is halfway up the level in one throw.
      { type: 'launch-pad', id: 'pad-01', col: 10, row: 22, width: 3, liftTiles: 7 },
      {
        type: 'spike-bank',
        id: 'sbank-01',
        col: 10,
        width: 3,
        hiddenRow: 13,
        lethalRow: 17,
        timing: { idleMs: 1050, warningMs: 1200, activeMs: 800, cooldownMs: 650 },
      },
      // THE SLOW WAY, twelve columns further on and never threatened by
      // anything: a shorter throw onto a lower tier, and two more hops to
      // rejoin the fast route. It exists so that refusing the first pad is
      // always a real option and never a wait for a window that may be
      // awkward — the sector asks the player to decline launches, and
      // declining has to lead somewhere.
      { type: 'launch-pad', id: 'pad-02', col: 24, row: 22, width: 3, liftTiles: 5 },
      // BETWEEN THE TWO PADS, so the walk from the threatened one to the safe
      // one is itself a decision rather than a concession. Refusing the fast
      // route stays a real option — the point of `pad-02` — but it stops
      // being a free one.
      {
        type: 'spike-bank',
        id: 'sbank-02',
        col: 17,
        width: 2,
        hiddenRow: 23,
        lethalRow: 21,
        timing: { idleMs: 1600, warningMs: 500, activeMs: 700, cooldownMs: 400 },
      },
      // On the tier where the two routes rejoin, so neither of them arrives
      // at an empty walk.
      { type: 'laser', id: 'laser-01', col: 28, topRow: 11, bottomRow: 14 },
    ],
  },
  {
    id: 'sector-07-level-03',
    name: 'GATE',
    width: 48,
    groundRow: 22,
    gaps: [],
    spikeColumns: [6, 7],
    platforms: [
      { col: 18, row: 16, width: 10 },
      { col: 30, row: 13, width: 7 },
    ],
    playerStartCol: 2,
    exitCol: 32,
    exitRow: 13,
    traps: [
      { type: 'launch-pad', id: 'pad-01', col: 12, row: 22, width: 3, liftTiles: 7 },
      // ACROSS THE ARC, not across the floor. A `timing-gate` blocks and
      // never kills, which is exactly what this level wants: launched while
      // it is shut, the player hits it in mid-air and comes down on the same
      // side they left from. The cost is the walk back and the wait for the
      // next launch — the price of a bad decision in this sector, stated
      // once, plainly, before the two levels that charge more for it.
      { type: 'timing-gate', id: 'gate-01', col: 17, topRow: 12, bottomRow: 21 },
      // ON THE WALK OVER, NEVER OVER THE PAD. That distinction is what lets
      // this sector be extended at all: a hazard above a pad has to
      // out-telegraph the whole flight through it plus 300 ms, because
      // `Player.launch` fixes the arc at the moment of firing (CLAUDE.md
      // #4.5). Beside the pad, the ordinary 250 ms rule applies and refusing
      // is still free — which is the verb of the entire sector.
      {
        type: 'spike-bank',
        id: 'sbank-01',
        col: 9,
        width: 2,
        hiddenRow: 23,
        lethalRow: 21,
        timing: { idleMs: 1800, warningMs: 500, activeMs: 600, cooldownMs: 400 },
      },
      // Past the gate, on the tier it guards — so getting through the
      // barrier is arriving somewhere rather than finishing.
      { type: 'laser', id: 'laser-01', col: 23, topRow: 12, bottomRow: 15 },
    ],
  },
  {
    id: 'sector-07-level-04',
    name: 'THROUGH',
    width: 48,
    groundRow: 22,
    gaps: [],
    spikeColumns: [8, 9],
    platforms: [
      { col: 20, row: 17, width: 8 },
      { col: 31, row: 14, width: 7 },
    ],
    playerStartCol: 2,
    exitCol: 33,
    exitRow: 14,
    traps: [
      { type: 'launch-pad', id: 'pad-01', col: 14, row: 22, width: 3, liftTiles: 6 },
      // IN THE MIDDLE OF THE ARC — beside the pad, not over it, and that
      // distinction is the level's safety net. A jump can be cut short by
      // letting go of the button; a launch cannot (`Player.launch` — the cut
      // is disabled on purpose, since the player never asked for the height).
      // What they do keep is horizontal control, so a launch taken on a bad
      // beat can still be abandoned in the air: stop steering right, come
      // down where you left, try the next one. The beam charges for crossing,
      // not for having been thrown.
      //
      // 2800 ms against the pad's 2300 — deliberately not a multiple, so the
      // beam is in a different place on every launch and the player has to
      // read it each time rather than learn one rhythm.
      //
      // The 1000 ms warning is longer than `tests/launch-window.test.ts`
      // demands of a beam standing off to the side (it demands nothing of
      // one), and that is a level-design choice rather than a rule: the
      // whole point here is that the player decides on the ground, so the
      // beam has to be readable from the ground.
      {
        type: 'laser',
        id: 'laser-01',
        col: 18,
        topRow: 15,
        bottomRow: 21,
        timing: { idleMs: 1000, warningMs: 1000, activeMs: 600, cooldownMs: 200 },
      },
      // ON THE WALK OVER, NEVER OVER THE PAD. That distinction is what lets
      // this sector be extended at all: a hazard above a pad has to
      // out-telegraph the whole flight through it plus 300 ms, because
      // `Player.launch` fixes the arc at the moment of firing (CLAUDE.md
      // #4.5). Beside the pad, the ordinary 250 ms rule applies and refusing
      // is still free — which is the verb of the entire sector.
      {
        type: 'spike-bank',
        id: 'sbank-01',
        col: 11,
        width: 2,
        hiddenRow: 23,
        lethalRow: 21,
        timing: { idleMs: 1900, warningMs: 500, activeMs: 600, cooldownMs: 400 },
      },
      // On the far side of the beam, where the arc puts the player down.
      { type: 'laser', id: 'laser-02', col: 24, topRow: 13, bottomRow: 16, initialIdleMs: 800 },
    ],
  },
  {
    id: 'sector-07-level-05',
    name: 'RELAY',
    width: 48,
    groundRow: 22,
    // Under the whole crossing: the platform is not where you land if you
    // leave at the wrong moment, and this is what "not where you land" costs.
    gaps: [[20, 30]],
    spikeColumns: [7, 8],
    platforms: [{ col: 34, row: 14, width: 7 }],
    playerStartCol: 2,
    exitCol: 36,
    exitRow: 14,
    traps: [
      { type: 'launch-pad', id: 'pad-01', col: 10, row: 22, width: 3, liftTiles: 6 },
      // THE LANDING ITSELF IS ON A CLOCK. Everything else in the sector puts
      // a hazard in the way of a fixed destination; here the destination is
      // the moving part, and the launch has to be spent at the moment the
      // slab is at this end of its run. `LevelValidator` counts the ride, so
      // the route is proved — what it cannot prove, and what the level is
      // about, is leaving on the right beat.
      //
      // THE RIDE IS SHORT AND THE DECK IS WIDE, and both numbers come from
      // the owner playing it: «долго приходится ждать чтобы платформа
      // доехала и чтобы прям в тайминг». Two separate complaints, and
      // they had two separate causes. The waiting was a 2600 ms one-way trip,
      // so a missed beat cost 5.2 s of standing on a pad watching a slab —
      // longer than most levels in the campaign take to finish. The timing
      // was a four-tile deck: the arc is fixed the moment the pad fires
      // (`Player.launch` disables the jump cut), so deck width IS the whole
      // margin for error, and four tiles gave the narrowest one in the game.
      //
      // 1700 ms is 71 px/s, still well under the player's 110, so #13 holds
      // and the slab remains something you outrun rather than chase. Five
      // tiles is the width sector 06 already uses for its own landings.
      {
        type: 'moving-platform',
        id: 'movp-01',
        fromCol: 16,
        fromRow: 17,
        toCol: 28,
        toRow: 17,
        width: 5,
        travelMs: 1700,
      },
      // ON THE TIER THE RIDE ENDS AT, and nowhere on the ride itself. A
      // rider has no ground to step off onto, so a hazard over the slab
      // would be one the player cannot refuse — the whole sector is built on
      // being able to. The beam charges for arriving, not for travelling.
      { type: 'laser', id: 'laser-01', col: 37, topRow: 10, bottomRow: 13 },
    ],
  },
  {
    id: 'sector-07-level-06',
    name: 'REDLINE',
    width: 48,
    groundRow: 22,
    gaps: [[24, 30]],
    spikeColumns: [4, 5],
    platforms: [
      { col: 12, row: 16, width: 4 },
      { col: 21, row: 11, width: 8 },
      { col: 32, row: 8, width: 7 },
      { col: 30, row: 5, width: 8 },
    ],
    playerStartCol: 2,
    exitCol: 32,
    exitRow: 5,
    traps: [
      { type: 'launch-pad', id: 'pad-01', col: 8, row: 22, width: 3, liftTiles: 7 },
      // The ceiling bank of HOLD FIRE, over the first launch.
      {
        type: 'spike-bank',
        id: 'sbank-01',
        col: 8,
        width: 3,
        hiddenRow: 12,
        lethalRow: 17,
        timing: { idleMs: 1300, warningMs: 1200, activeMs: 900, cooldownMs: 700 },
      },
      // The second launch is taken from the far end of a four-tile ledge, so
      // reaching the pad and deciding whether to stay on it are two separate
      // moves rather than one.
      { type: 'launch-pad', id: 'pad-02', col: 16, row: 16, width: 3, liftTiles: 6 },
      // And THROUGH's beam across that second arc.
      {
        type: 'laser',
        id: 'laser-01',
        col: 20,
        topRow: 7,
        bottomRow: 15,
        timing: { idleMs: 900, warningMs: 1000, activeMs: 650, cooldownMs: 250 },
      },
      // Across the long row-11 tier, which was the one stretch of this
      // finale that asked nothing at all.
      { type: 'laser', id: 'laser-02', col: 25, topRow: 7, bottomRow: 10, initialIdleMs: 500 },
      // AND GATE'S BARRIER ON THE LAST CLIMB. The sector closer should cite
      // the cheap refusal as well as the expensive ones: shut, this costs
      // the hop to the roof and nothing else, which is exactly the price
      // `GATE` spent a whole level establishing.
      { type: 'timing-gate', id: 'gate-01', col: 34, topRow: 4, bottomRow: 7 },
    ],
  },
];
