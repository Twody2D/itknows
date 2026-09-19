import type { LevelDef } from '@/gameplay/LevelDef';
import { dropSpike, floorSpikes } from './ambush';

/**
 * SECTOR 02 — NEON GRID. Nothing holds still.
 *
 * Sector 01 taught that the floor can betray you. This one takes the idea
 * off the ground: ledges that crumble once you land, spikes that travel on
 * curves instead of lines, and one bridge that is genuinely the only way
 * across. The common thread is that standing still stops being the safe
 * default — which is the exact habit sector 03's timed beams will then
 * demand back.
 *
 *   01 CRUMBLE   — the ledge falls after you land on it
 *   02 PENDULUM  — a spike that swings, and visibly slows to turn
 *   03 ORBIT     — a spike that circles and never slows
 *   04 FREEFALL  — the floor that drops, now over a real pit
 *   05 BRIDGE    — a pit no jump can cross
 *   06 GRID CORE — all of it, climbing
 */
export const SECTOR_02_LEVELS: LevelDef[] = [
  {
    id: 'sector-02-level-01',
    name: 'CRUMBLE',
    width: 48,
    groundRow: 22,
    gaps: [],
    // UNDER THE TOP HALF OF THE CLIMB, not under all of it. The level used
    // to drop a failed climb onto clean ground, walk the player back, and
    // let them try again from the same spot at no cost at all — which the
    // owner played and called exactly what it was ("сектор Crumble слишком
    // лёгкий и проходится очень просто"). Now the first two ledges are
    // still free to fail, and the last two are not.
    //
    // They sit under the far edges of `dp-03` and `dp-04` — the tiles the
    // route actually stands on — and the player steers in the air, so a
    // fall is a landing to aim rather than a sentence (the same rule
    // `ASCENT` already plays by).
    spikeColumns: [23, 24, 29, 30],
    // Only the top is solid now. The launch pad at row 19 was a free rung
    // in the middle of the ladder: the climb was three crumbling ledges
    // with a rest stop, and a rest stop is the one thing a crumbling climb
    // must not have.
    platforms: [{ col: 34, row: 7, width: 6 }],
    playerStartCol: 2,
    exitCol: 36,
    exitRow: 7,
    traps: [

      // THE LADDER IS NOT THE WHOLE LEVEL ANY MORE. It was: four rungs, hop
      // hop hop, done — "быстренько запрыгиваешь наверх и всё, это весь
      // уровень, никакой ловушки" (owner). Both ends of the climb are now
      // defended, and both are answered by stopping, which is the one thing
      // a crumbling ladder never lets you do halfway up.
      //
      // The first rung: walking at it from the ground arms a bank that
      // punches up through the ledge. The rung has not been touched yet, so
      // it is not going anywhere — wait, and the climb is on. Run at it and
      // the climb ends before it starts.
      ...floorSpikes('sbank-01', 10, 3, 19, { triggerRow: 22 }),
      // The last rung: landing on it drops a spike onto the top platform
      // between the player and the door, and leaves it there for over a
      // second. The top is solid ground, so waiting costs nothing — but
      // only if the climb is finished before reading the situation, which
      // is the opposite of how the rest of the level has to be played.
      ...dropSpike('dspike-01', 35, 6, 10, { lead: 7, activeMs: 1100 }),
      // FOUR LEDGES, NO REST. The whole ladder from the ground to the top
      // is made of floor that crumbles on contact, so it can only be taken
      // in one unbroken run — 350ms of visible flicker per rung, which is
      // the telegraph and the entire budget for deciding where to go next
      // (CLAUDE.md #4.2). Four columns between the ledges at a three-row
      // rise is the campaign's standard hop; what is new here is that there
      // is nowhere to stop and read the next one.
      { type: 'disappearing-platform', id: 'dp-01', col: 10, row: 19, width: 3 },
      { type: 'disappearing-platform', id: 'dp-02', col: 16, row: 16, width: 3 },
      { type: 'disappearing-platform', id: 'dp-03', col: 22, row: 13, width: 3 },
      { type: 'disappearing-platform', id: 'dp-04', col: 28, row: 10, width: 3 },
    ],
  },
  {
    id: 'sector-02-level-02',
    name: 'PENDULUM',
    width: 48,
    groundRow: 22,
    gaps: [[24, 27]],
    // NO GROUND SPIKES UNDER THE SWINGS. Columns 16-17 sat directly beneath
    // `swing-02`, so the one place the pendulum forced the player to stand
    // still and wait was also the one place standing still killed them —
    // two hazards sharing a tile, each fair on its own and unreadable
    // together (owner: "Pendulum трудно пройти, потому что шипы по
    // середине"). The level's demand is timing three arcs; the floor under
    // them is where that timing gets done.
    spikeColumns: [],
    platforms: [{ col: 32, row: 19, width: 5 }],
    playerStartCol: 2,
    exitCol: 43,
    traps: [

      // The home straight past the last swing looked like the reward for
      // reading three of them. It is a bank instead.
      // Moved clear of the platform overhead. A trigger band is five tiles
      // tall now — it has to be, to catch a player jumping across it
      // (`APPROACH_BAND_TILES`) — and at the old column it reached up into
      // the ledge above, so simply standing on that ledge spent the trap
      // on nobody.
      ...floorSpikes('sbank-01', 40, 3, 22),
      // A swing visibly decelerates to turn around at each extreme, and the
      // deceleration is the read: the safe moment is when the spike is
      // farthest away, not a fixed beat. Three of them at different periods
      // across one corridor, so there is no single rhythm that clears the
      // level — each has to be watched on approach.
      { type: 'swinging-spike', id: 'swing-01', pivotCol: 12, pivotRow: 15, lengthTiles: 3, maxAngleDeg: 42, periodMs: 2100 },
      { type: 'swinging-spike', id: 'swing-02', pivotCol: 21, pivotRow: 15, lengthTiles: 4, maxAngleDeg: 38, periodMs: 1700 },
      { type: 'swinging-spike', id: 'swing-03', pivotCol: 31, pivotRow: 14, lengthTiles: 3, maxAngleDeg: 46, periodMs: 2400 },
    ],
  },
  {
    id: 'sector-02-level-03',
    name: 'ORBIT',
    width: 48,
    groundRow: 22,
    gaps: [],
    spikeColumns: [],
    platforms: [
      { col: 10, row: 19, width: 5 },
      { col: 19, row: 16, width: 5 },
      { col: 28, row: 13, width: 5 },
      { col: 37, row: 10, width: 6 },
    ],
    playerStartCol: 2,
    exitCol: 39,
    exitRow: 10,
    traps: [

      // Nothing in this level used to spring: three orbits on fixed clocks,
      // readable from the spawn, cleared first try by anyone patient. The
      // walk to the first tier now costs attention too.
      ...floorSpikes('sbank-01', 10, 3, 22),
      // The opposite read to the pendulum, which is why it follows it
      // directly: a fixed arm at constant speed, never slowing, never
      // reversing. Each one is parked on the gap between two tiers, so the
      // jump is always available and only ever at the wrong moment. The
      // steady sweep is its own telegraph (`TrapDef.ts`) — no warning phase
      // needed, and crossable first try by anyone watching.
      // RADIUS 3, NOT 1.75. Each orbit is pivoted over the gap between two
      // tiers, and at 1.75 the whole circle fitted inside that gap: it swept
      // empty air between the ledges and could not touch anyone standing on
      // either of them — "я стою на платформе, и он до меня не доезжает"
      // (owner). At 3 the circle's left and right extremes reach the facing
      // edges of both ledges (measured: at the upper ledge's edge the spike
      // passes at y 156-162 against a stander's 128-160 box, and at the
      // lower one at 165-171 against 158-190), so standing at the lip is a
      // timed decision and the middle of each ledge is still a safe perch.
      { type: 'orbit-spike', id: 'orbit-01', pivotCol: 17, pivotRow: 18, radiusTiles: 3, periodMs: 2400 },
      { type: 'orbit-spike', id: 'orbit-02', pivotCol: 26, pivotRow: 15, radiusTiles: 3, periodMs: 2000 },
      { type: 'orbit-spike', id: 'orbit-03', pivotCol: 35, pivotRow: 12, radiusTiles: 3, periodMs: 2800 },
    ],
  },
  {
    id: 'sector-02-level-04',
    name: 'FREEFALL',
    width: 48,
    groundRow: 22,
    // EVERY OTHER STONE HOLDS. The first cut of this level was four
    // falling stones over a twenty-five-column pit and nothing else, which
    // the owner played and rejected in the plainest terms: "все блоки прям
    // под тобой падают, даже нет возможности увернуться". He is describing
    // a level with exactly one solution and no room inside it — miss the
    // rhythm once and the crossing is already lost, with nothing to do
    // about it.
    //
    // Now the chain alternates, and it is continuous. Three solid slabs
    // make a complete route across on their own — the solver proves it,
    // because it counts no falling floor as a surface at all — and the two
    // stones between them close the walkway into one unbroken run. So the
    // level can be taken at a sprint, or slab to slab in three hops, and
    // the stones decide which by whether the player keeps moving.
    gaps: [[14, 34]],
    spikeColumns: [8, 9],
    platforms: [
      { col: 17, row: 19, width: 3 },
      { col: 23, row: 19, width: 3 },
      { col: 29, row: 19, width: 3 },
    ],
    playerStartCol: 2,
    exitCol: 43,
    traps: [

      // Surviving the stones is not the end of the level any more.
      ...dropSpike('dspike-01', 39, 21, 22),
      // Slotted between the slabs with no seam anywhere: 17..31 is one
      // unbroken walkway, so running it flat out works — three columns take
      // 270ms and a stone holds for 320ms. Stop or hesitate on one and it
      // is gone, and the crossing becomes three deliberate hops between the
      // slabs (30px each, against a 57.9px jump) with holes where the
      // stones used to be.
      { type: 'falling-platform', id: 'flp-01', col: 20, row: 19, width: 3 },
      { type: 'falling-platform', id: 'flp-02', col: 26, row: 19, width: 3 },
    ],
  },
  {
    id: 'sector-02-level-05',
    name: 'BRIDGE',
    width: 48,
    groundRow: 22,
    // A pit far wider than any jump, with a slab that is genuinely
    // transport rather than a moving floor — the same trap as sector 01's
    // SHIFT, sized the other way round so what reads is the bridge, not the
    // hole. `LevelValidator` models the ride as a real edge between its two
    // ends, so "solvable" here means solvable *by riding it*.
    gaps: [[17, 33]],
    // Moved off the boarding tile. At 10-11 they sat inside the pendulum's
    // own sweep, which is the mistake PENDULUM was just fixed for: two
    // hazards sharing a tile are each fair alone and unreadable together.
    spikeColumns: [6, 7],
    platforms: [{ col: 38, row: 19, width: 5 }],
    playerStartCol: 2,
    exitCol: 40,
    exitRow: 19,
    traps: [
      // THE FAR SIDE OF THE BRIDGE, where the player relaxes — and `pnpm
      // levels` reports that the proved route never comes near it, which is
      // correct and is the point. The solver rides the slab to column 33 and
      // hops straight onto the row-19 ledge at 38, clearing this entirely.
      // What it charges for is the hop that falls short: land on the ground
      // instead of the ledge and you land on these. A bank under the landing
      // of a jump that can be missed is not a trap in the void, it is what
      // makes missing cost something.
      ...floorSpikes('sbank-01', 35, 3, 22),
      // ROW 21, NOT 19, AND IT STARTS AT THE PIT'S EDGE. This is why the
      // level was impassable ("уровень bridge непроходимый" — owner): the
      // slab used to ride three rows above the boarding ground, and a jump
      // from the ground tops out 34.7px up, which clears the slab's surface
      // by four and a half pixels. Landing on it meant catching a two-frame
      // window at the apex of a blind vertical jump, onto a three-tile slab
      // that was already sliding away — and `LevelValidator` never noticed,
      // because it models the ride as an edge between the slab's two ends
      // and has nothing to say about boarding it.
      //
      // One row up is a step, not a stunt: the player walks to the lip at
      // column 16 and hops ten pixels onto a slab waiting right there. It
      // is still a mechanical platform rather than floor (`asFloor` is only
      // for the ground row), so it still reads as transport.
      {
        type: 'moving-platform',
        id: 'movp-01',
        fromCol: 17,
        fromRow: 21,
        toCol: 30,
        toRow: 21,
        width: 4,
        travelMs: 3400,
      },
      // On solid ground at the boarding end, never over the ride: a hazard
      // the player cannot steer away from while it is lethal would break
      // CLAUDE.md #4.5's reaction window no matter how long its warning ran.
      // Pivoted at 11 so its arc stops well short of the lip at 16 — the
      // toll is paid on the approach, and waiting to board is safe.
      { type: 'swinging-spike', id: 'swing-01', pivotCol: 11, pivotRow: 15, lengthTiles: 4, maxAngleDeg: 40, periodMs: 1800 },
    ],
  },
  {
    id: 'sector-02-level-06',
    name: 'GRID CORE',
    width: 48,
    groundRow: 22,
    // The sector's exam: cross a moving floor, climb ledges that will not
    // wait, and do it under an orbit that never stops. The exit is at the
    // top, so every idea has to be solved on the way through.
    gaps: [[15, 20]],
    spikeColumns: [9, 10],
    platforms: [
      { col: 24, row: 19, width: 5 },
      { col: 38, row: 13, width: 6 },
    ],
    playerStartCol: 2,
    exitCol: 40,
    exitRow: 13,
    traps: [

      // Moved clear of the platform overhead. A trigger band is five tiles
      // tall now — it has to be, to catch a player jumping across it
      // (`APPROACH_BAND_TILES`) — and at the old column it reached up into
      // the ledge above, so simply standing on that ledge spent the trap
      // on nobody.
      ...dropSpike('dspike-01', 13, 21, 22),
      {
        type: 'moving-platform',
        id: 'movp-01',
        fromCol: 15,
        fromRow: 22,
        toCol: 17,
        toRow: 22,
        width: 4,
        travelMs: 2200,
      },
      { type: 'disappearing-platform', id: 'dp-01', col: 31, row: 16, width: 4 },
      { type: 'orbit-spike', id: 'orbit-01', pivotCol: 29, pivotRow: 18, radiusTiles: 1.75, periodMs: 1900 },
      { type: 'swinging-spike', id: 'swing-01', pivotCol: 36, pivotRow: 9, lengthTiles: 3, maxAngleDeg: 44, periodMs: 1600 },
    ],
  },
];
