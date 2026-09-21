import type { LevelDef } from '@/gameplay/LevelDef';
import { dropSpike, floorSpikes } from './ambush';

/**
 * SECTOR 05 — SYSTEM CORE. Waiting now costs something.
 *
 * The campaign's closing argument, and the only sector that attacks the
 * habit the previous four built. Sectors 03 and 04 taught patience: find the
 * safe tile, read the cycle, then commit. This one takes the safe tile away
 * — the pursuer turns every wait into a trade instead of a free action, and
 * suddenly every beam the player learned to sit and watch is expensive.
 *
 *   01 HUNTED      — something is behind you
 *   02 CHASE       — and the floor is moving too
 *   03 MIRROR      — the exit you expected is not the exit
 *   04 GAUNTLET    — four families, one screen
 *   05 PRESSURE    — beams to wait for, with the wait charged for
 *   06 SYSTEM CORE — the full height of the screen
 *
 * Nothing here is faster than the player (`speedFactor` below 1, CLAUDE.md
 * #13), so the pressure is always survivable by moving well; it is never a
 * race that was lost at the spawn point.
 *
 * ONE FAKE EXIT IN THE WHOLE SECTOR (`sector-05-level-03`), the cap
 * CLAUDE.md #4.7 sets. It stands on the obvious path at ground level with
 * the real exit plainly visible above it, its core unlit — the
 * distinguishing mark the same rule requires — and reaching it costs a walk
 * back rather than a life.
 */
export const SECTOR_05_LEVELS: LevelDef[] = [
  {
    id: 'sector-05-level-01',
    name: 'HUNTED',
    width: 48,
    groundRow: 22,
    gaps: [[20, 23]],
    spikeColumns: [13, 14, 30, 31],
    platforms: [],
    // Seven columns clear of the drone, not three. Together with its own
    // two-second hold that is the daylight the level opens with — long
    // enough to look at the screen before running, which is the whole
    // difference between a chase and an ambush from off-camera.
    playerStartCol: 7,
    exitCol: 43,
    traps: [

      ...floorSpikes('sbank-01', 26, 3, 22),
      // TWO COLUMNS BEHIND THE PLAYER AT 0.75, not seven behind at 0.6.
      //
      // At the old numbers the drone was a decoration: a clean run reached
      // the exit with it still twenty tiles back, so the thing the whole
      // sector is built on — that waiting now costs something — never
      // happened at all ("красный шар слишком долго стоит слева, я могу
      // успеть пройти уровень до того как он доедет до меня", owner). At
      // 0.8 a player who keeps moving still finishes several tiles clear of
      // it, which is CLAUDE.md #13 intact: it is never faster than they
      // are. What changed is that every pause — reading the spike pair,
      // timing the pit, waiting out the patrol — is now paid for.
      //
      // Eased once more to 0.75 across the whole sector — "во всём секторе
      // 5 чуть уменьши скорость шарика который за мной летит" (owner) — a
      // small trim, not a reversal: still faster than CHASE/PRESSURE's 0.65
      // because this is the sector's opener and the one place a player
      // meets the pursuer with no other hazard already in play.
      { type: 'pursuer', id: 'pursuer-01', col: 5, row: 21, speedFactor: 0.75 },
      // ON THE FLOOR, not hovering two rows above it. At row 19 this spike
      // sat exactly at the android's chest — visibly through it — and could
      // not be stood under, jumped over comfortably, or ignored; it only
      // ever passed through the player because lethality was read off a box
      // around their shins (`Player.hurtBounds`). Now that it can actually
      // hit, it belongs where the sector has taught the player to read it:
      // a slow patrol along the ground, the shape of `PATROL` in sector 01,
      // cleared by one jump.
      { type: 'moving-spike', id: 'mspike-01', fromCol: 34, fromRow: 21, toCol: 40, toRow: 21, travelMs: 2400 },
    ],
  },
  {
    id: 'sector-05-level-02',
    name: 'CHASE',
    width: 48,
    groundRow: 22,
    // Sector 01's moving hole, with something behind you. On its own the
    // sliding floor is a patience puzzle: wait for the slab, step on,
    // ride. Here waiting is the one thing that is not free, so the crossing
    // has to be taken at the moment it opens rather than the moment it is
    // comfortable.
    gaps: [[16, 33]],
    spikeColumns: [9, 10],
    platforms: [],
    playerStartCol: 4,
    exitCol: 43,
    traps: [

      ...dropSpike('dspike-01', 40, 21, 22),
      // Closer and faster than it was (col 0 / 0.55), but gentler than
      // HUNTED's: this level's crossing REQUIRES standing still while the
      // slab comes back, so the drone has to price that wait without
      // making it unaffordable.
      //
      // Eased to 0.65 with the rest of the sector — "во всём секторе 5
      // чуть уменьши скорость шарика который за мной летит" (owner) — same
      // trim as PRESSURE, since both share the same "you must stand still
      // here" shape and paid the same speed price for it.
      { type: 'pursuer', id: 'pursuer-01', col: 2, row: 21, speedFactor: 0.65 },
      {
        type: 'moving-platform',
        id: 'movp-01',
        fromCol: 16,
        fromRow: 22,
        toCol: 21,
        toRow: 22,
        width: 13,
        travelMs: 2400,
      },
    ],
  },
  {
    id: 'sector-05-level-03',
    name: 'MIRROR',
    width: 48,
    groundRow: 22,
    gaps: [],
    spikeColumns: [16, 17],
    platforms: [
      { col: 34, row: 19, width: 5 },
      { col: 26, row: 16, width: 5 },
      { col: 34, row: 13, width: 6 },
    ],
    playerStartCol: 2,
    exitCol: 36,
    exitRow: 13,
    traps: [

      ...floorSpikes('sbank-01', 22, 3, 22),
      // COLUMN 43, NOT 27 — AND NOW IT IS AVOIDABLE, which is the whole
      // repair.
      //
      // At 27 this door stood across the only ground corridor: the climb
      // starts at the row-19 tier (columns 34-38), so every route to the
      // real exit walked through the decoy's catch area on the way there.
      // A player did not choose it, they were processed by it — "портал
      // невозможно обойти" (owner). A trap you cannot decline is a toll
      // booth, and that is doubly wrong for one that costs the walk back.
      //
      // Column 43 is where every exit in sectors 01-04 sits, on the ground,
      // at the far right, past everything. So the level asks its question
      // properly now: at column 34 the climb goes up, and the habit of four
      // sectors says keep running right. Turning up is free; the door only
      // ever takes someone who walked past their own route to reach it.
      //
      // It is also, as of the same round, drawn exactly like the real thing
      // — lit core, same glow, same anchoring (`FakeExit`, CLAUDE.md #4.7's
      // 2026-09-18 decision). Unreadable and unavoidable would have been
      // unfair; unreadable and avoidable is the question this level is
      // named after.
      { type: 'fake-exit', id: 'fake-exit-01', col: 43, row: 22 },
      // `fromRow` 17, not the default: the patrolling spike sweeps row 15
      // across these columns, and two hazards may never share tiles
      // (`tests/level-def-sanity.test.ts`). It guards the corridor rather
      // than the door — with the decoy moved to the far right, the run up
      // to the climb is what this is for.
      ...dropSpike('dspike-01', 28, 21, 22, { fromRow: 17 }),
      { type: 'laser', id: 'laser-01', col: 31, topRow: 17, bottomRow: 21 },
      { type: 'moving-spike', id: 'mspike-01', fromCol: 27, fromRow: 15, toCol: 32, toRow: 15, travelMs: 1700 },
    ],
  },
  {
    id: 'sector-05-level-04',
    name: 'GAUNTLET',
    width: 48,
    groundRow: 22,
    gaps: [[22, 26]],
    spikeColumns: [11, 12],
    platforms: [
      { col: 30, row: 19, width: 5 },
      { col: 22, row: 16, width: 5 },
      { col: 30, row: 13, width: 5 },
      { col: 38, row: 10, width: 6 },
    ],
    playerStartCol: 2,
    exitCol: 40,
    exitRow: 10,
    traps: [

      ...dropSpike('dspike-01', 16, 21, 22),
      // Columns 18-20, not 16-18: the drop spike lands on 16, and a piston
      // sharing that tile meant one of the two was always wasted. Two steps
      // further on it is a second beat instead of a duplicate of the first,
      // and column 21 stays clear as the take-off for the pit.
      { type: 'spike-bank', id: 'sbank-01', col: 18, width: 3, hiddenRow: 23, lethalRow: 21 },
      { type: 'laser', id: 'laser-01', col: 28, topRow: 17, bottomRow: 21, initialIdleMs: 700 },
      { type: 'orbit-spike', id: 'orbit-01', pivotCol: 28, pivotRow: 15, radiusTiles: 1.75, periodMs: 1900 },
      { type: 'disappearing-platform', id: 'dp-01', col: 35, row: 16, width: 3 },
    ],
  },
  {
    id: 'sector-05-level-05',
    name: 'PRESSURE',
    width: 48,
    groundRow: 22,
    gaps: [[26, 30]],
    spikeColumns: [12, 13, 20, 21],
    platforms: [{ col: 34, row: 19, width: 5 }],
    playerStartCol: 4,
    exitCol: 43,
    traps: [

      ...floorSpikes('sbank-01', 34, 3, 22),
      // The pursuer against the sector's timed hazards rather than against
      // plain geometry: every beam here is a wait, and the wait is now
      // being charged for. The ground between them is still wide enough to
      // take that wait — just not twice.
      //
      // Eased to 0.65 with the rest of the sector — "во всём секторе 5
      // чуть уменьши скорость шарика который за мной летит" (owner).
      { type: 'pursuer', id: 'pursuer-01', col: 2, row: 21, speedFactor: 0.65 },
      { type: 'laser', id: 'laser-01', col: 17, topRow: 16, bottomRow: 21 },
      { type: 'laser', id: 'laser-02', col: 24, topRow: 16, bottomRow: 21, initialIdleMs: 800 },
      // Columns 38-42, not 36-40: `sbank-01` punches up through 34-36, so
      // column 36 was floor plate and piston at once.
      // Same long idle as sector 04's plates: invisible while safe, so the
      // flare is the only tell (see `CURRENT`'s own note).
      { type: 'electric-floor', id: 'ef-01', col: 38, width: 5, row: 22, timing: { idleMs: 2400, warningMs: 500, activeMs: 500, cooldownMs: 250 } },
    ],
  },
  {
    id: 'sector-05-level-06',
    name: 'SYSTEM CORE',
    width: 48,
    groundRow: 22,
    gaps: [[17, 21]],
    spikeColumns: [9, 10],
    // The campaign's tallest climb: six tiers from the ground to row 5, the
    // full height of the screen, with the exit at the top. Every hazard on
    // it has been met before and none of them is new — the finale is about
    // doing all of it in one run, not about one last surprise. The row-10
    // tier is short and out of reach of the one below on purpose, so the
    // single crumbling ledge in the level is load-bearing rather than
    // decorative.
    platforms: [
      { col: 24, row: 19, width: 5 },
      { col: 32, row: 16, width: 5 },
      // Columns 26-30, not 24-28. The climb used to hang on `dp-01`, the
      // one crumbling ledge in the level: from here the row-10 tier was
      // 50px away at a three-row rise against 40.6px of reach, so the only
      // route ran across a ledge that dissolves in 350ms and then stays
      // gone for a second and a half. Miss it and the whole climb starts
      // again from the ground — which is what "system core непроходимый
      // уровень" (owner) actually feels like from the inside. Shifted
      // right, the tier above is a plain 20px hop and `dp-01` goes back to
      // being the shortcut it should have been.
      { col: 26, row: 13, width: 5 },
      { col: 33, row: 10, width: 4 },
      // Columns 32-36, not 26-30. At 26-30 this tier sat directly above
      // both the row-13 tier (26-30) AND `dp-01` (28-30, row 10) — three
      // platforms in a straight vertical line, three rows apart each, which
      // turned the mandatory `swing-01` transfer into an optional one: "три
      // платформы друг на другом стоят там можно просто нажать 3 раза
      // пробел и я окажусь на верху" (owner). Moved to sit above the row-10
      // tier instead — which is what `swing-01`'s own placement already
      // assumed ("over the left half of the row-10 tier... the tier above")
      // — the vertical shortcut is gone and the swing is the only way up
      // from row 10, exactly as documented below.
      { col: 32, row: 7, width: 5 },
      // Row 5, not row 4. The exit door is drawn 50px tall from the surface
      // it stands on, so a row-4 landing pushed its top 10px off the screen
      // — the campaign's last door was the one door you could not see all
      // of. This is still the highest tier in the game.
      { col: 32, row: 5, width: 6 },
    ],
    playerStartCol: 2,
    exitCol: 34,
    exitRow: 5,
    traps: [

      ...dropSpike('dspike-01', 13, 21, 22),
      // Moved off columns 13-15, where it shared its tiles with the drop
      // spike above. Under the foot of the climb instead, where it is the
      // last thing between the player and the first tier.
      { type: 'spike-bank', id: 'sbank-01', col: 24, width: 3, hiddenRow: 23, lethalRow: 21 },
      {
        type: 'moving-platform',
        id: 'movp-01',
        fromCol: 17,
        fromRow: 19,
        toCol: 21,
        toRow: 19,
        width: 3,
        travelMs: 2200,
      },
      // ROW 14, NOT ROW 17, and the three rows are the whole difference
      // between a beam and a decoration. The climb leaves the row-19 tier at
      // column 28 and lands on row 16 at column 32; crossing column 30 the
      // feet are at y≈161, so a beam starting at row 17 (y=170) was nine
      // pixels under every arc that ever passes it. It could only have
      // caught a player walking the ground at column 30 — which no route
      // needs, because the climb starts at column 24. Hung from the row-13
      // tier overhead instead, it stands in the hop it was written for and
      // still clears both landings. Found by `routeTrace` once the detector
      // started measuring real 3 px beams instead of whole tiles.
      { type: 'laser', id: 'laser-01', col: 30, topRow: 14, bottomRow: 21 },
      // Pivoted at 30/17 with a 1-tile radius, not 30/14 with 1.75.
      //
      // Measured at the old placement, the arc swept x285-319 / y125-159 —
      // which is the corridor between the row-16 and row-13 tiers AND both
      // landings at once: standing on the left edge of row 16 was lethal
      // for 32 frames of 120, the right edge of row 13 for 15, and the hop
      // between them for 22. No single moment of the cycle left the whole
      // crossing clear, so the climb's one mandatory transfer had no window
      // at all — "system core непроходимый уровень, шип который крутится по
      // кругу не даёт ни запрыгруть дальше никуда двинуться" (owner).
      //
      // It now turns in the open air over the row-19 → row-16 hop instead,
      // small enough that both ledges stay clear and only the flight path
      // crosses it. The hazard is the same; what changed is that waiting is
      // now an answer.
      { type: 'orbit-spike', id: 'orbit-01', pivotCol: 30, pivotRow: 17, radiusTiles: 1, periodMs: 1800 },
      { type: 'disappearing-platform', id: 'dp-01', col: 28, row: 10, width: 3 },
      // Pivoted at 31/row 4, not 28/row 3. At the old placement the bob
      // swept columns 26.4-30.6 at y 53-68 — which is the whole of the
      // row-7 tier, at exactly the height of a player standing on it. The
      // tier is mandatory and five columns wide, so there was nowhere on it
      // to stand and wait at any moment of the swing. Now the arc hangs
      // below that tier (y 70-88) and over the left half of the row-10 one:
      // the perch at columns 35-36 is safe, the tier above is safe, and the
      // hop between them is the thing being timed.
      { type: 'swinging-spike', id: 'swing-01', pivotCol: 31, pivotRow: 4, lengthTiles: 4, maxAngleDeg: 44, periodMs: 1600 },
    ],
  },
];
