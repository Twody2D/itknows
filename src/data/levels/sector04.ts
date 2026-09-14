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
    // THE FLOOR UNDER THE FALSE STAIRCASE. Eleven spikes, in plain sight
    // from the spawn, and they are what makes the staircase above them a
    // real question instead of a detour — see the staircase's own note in
    // `traps`.
    spikeColumns: [34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44],
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
      // Two singles along the real climb: each sits one hop further right
      // than the real tier at the same height — the tempting shortcut,
      // every time. Ordinary ground is under both, so falling through one
      // costs the climb and nothing else.
      { type: 'fake-platform', id: 'fakep-01', col: 28, row: 16, width: 4 },
      { type: 'fake-platform', id: 'fakep-03', col: 28, row: 10, width: 4 },

      // THE FALSE STAIRCASE — five rungs, none of them real, over a bed of
      // spikes. Asked for directly: "сделай фальшивую лестницу с фальшивыми
      // блоками, чтобы типо можно было забраться наверх по ним, но они были
      // фантомными, и сделать под ними шипы. Сейчас легко проходится и не
      // умирается" (owner).
      //
      // It reads as the short way up. The real climb doubles back on itself
      // four times across the middle of the screen; this goes straight from
      // the floor to the exit's own tier in five even hops, and its bottom
      // rung is two rows off the ground where a single jump obviously
      // reaches it. Every rung is a decoy.
      //
      // WHY THE SPIKES UNDER IT ARE STILL HONEST, given that a decoy is
      // drawn with the real slab's own texture (CLAUDE.md #4): the player
      // cannot read the rungs, but they can read the floor. Eleven static
      // spikes lie under the whole staircase, visible from the spawn point,
      // never hidden and never switched off — so the cost of being wrong is
      // on screen before the first jump, which is exactly what CLAUDE.md
      // #4's closing question asks. The real route is untouched and needs
      // none of this; taking the staircase is a choice to gamble on tiles
      // you have been shown you cannot verify, with the price written
      // underneath.
      { type: 'fake-platform', id: 'fakes-01', col: 34, row: 20, width: 3 },
      { type: 'fake-platform', id: 'fakes-02', col: 38, row: 17, width: 3 },
      { type: 'fake-platform', id: 'fakes-03', col: 42, row: 14, width: 3 },
      { type: 'fake-platform', id: 'fakes-04', col: 38, row: 11, width: 3 },
      { type: 'fake-platform', id: 'fakes-05', col: 34, row: 8, width: 3 },
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

      // Column 35, not 31: at 31 it landed inside `ef-02`'s live plate, two
      // hazards sharing tiles again. Between the second plate and the laser
      // is the one stretch of this level that was safe by construction.
      ...dropSpike('dspike-01', 35, 21, 22),
      // Two live plates with a spike pair marooned between them: the safe
      // ground in the middle is real but small, so crossing is two
      // decisions rather than one long dash. A floor that looks identical
      // whether or not it will kill you in half a second is the sector's
      // thesis stated plainly.
      // A LONG IDLE, because at idle the plate is now invisible and that is
      // the whole trap. On the default cycle it was only ever dark for 900
      // of every 1950ms, so a player walking up to it met it lit more often
      // than not, which is the same thing as marking it. At 2400 it spends
      // two thirds of its cycle indistinguishable from the floor either
      // side of it, and the 500ms warning flare — twice `MIN_WARNING_MS` —
      // is still the only thing that decides whether crossing is safe.
      { type: 'electric-floor', id: 'ef-01', col: 13, width: 6, row: 22, timing: { idleMs: 2400, warningMs: 500, activeMs: 500, cooldownMs: 250 } },
      { type: 'electric-floor', id: 'ef-02', col: 27, width: 6, row: 22, timing: { idleMs: 2400, warningMs: 500, activeMs: 500, cooldownMs: 250 } },
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

      // Moved clear of the platform overhead. A trigger band is five tiles
      // tall now — it has to be, to catch a player jumping across it
      // (`APPROACH_BAND_TILES`) — and at the old column it reached up into
      // the ledge above, so simply standing on that ledge spent the trap
      // on nobody.
      ...floorSpikes('sbank-01', 8, 3, 22),
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
      // FIRED FROM THE LIP OF THE PIT, so the spike appears while the
      // player is already in the air over it.
      //
      // Five columns of lead, not ten. At ten the whole fall happened
      // during the run-up — "третьи шипы падают слишком рано, ещё не
      // успеваю добежать" (owner) — and what waited at the far side was a
      // spike standing still, which is a wall, not an ambush. At five the
      // trigger's left edge sits on column 29, the last solid tile before
      // the pit: cross it at a run, take the jump, and the spike winks into
      // existence overhead mid-flight, hangs its `warningMs`, and is
      // falling as the landing arrives — "можно сделать чтобы в прыжке над
      // пропастью появлялся шип" (owner).
      //
      // What keeps it inside CLAUDE.md #4.2: the spike is not lethal while
      // it hangs (`AmbushSpikeTrap`'s HANG_MS), so the telegraph is intact
      // and visible; what the player loses is the option to answer it by
      // stopping, because they already jumped. That costs the attempt and
      // never the run — the pit is crossable from a standstill, and the
      // second time through, braking before the lip is the answer.
      ...dropSpike('mspike-03', 34, 21, 22, { lead: 5, activeMs: 1000 }),
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

      // Moved clear of the platform overhead. A trigger band is five tiles
      // tall now — it has to be, to catch a player jumping across it
      // (`APPROACH_BAND_TILES`) — and at the old column it reached up into
      // the ledge above, so simply standing on that ledge spent the trap
      // on nobody.
      ...dropSpike('dspike-01', 7, 21, 22),
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
      // THE STEP THAT WAS MISSING, and without it this level was a dead
      // end. From the right-hand ground the only way up was 34/19, and
      // from there the exit tier is six rows up — twice a jump. The one
      // link between them was the crumbling ledge at 29-31/16, away to the
      // left, and `orbit-01` sweeps columns 31.8-35.2 across rows
      // 14.8-18.2, which is precisely that gap: measured live, 30 staggered
      // attempts to make that hop landed it 0 times, 7 of them fatal and
      // the rest in the pit. "Когда ты попадаешь на правую сторону ты уже
      // никак не можешь пройти, шип нельзя перепрыгнуть" (owner) — a
      // softlock, and CLAUDE.md #4.4 does not bend.
      //
      // Columns 36-39 clear the orbit by less than a tile, so the climb
      // runs right along the spike's reach without ever needing to cross
      // it. The left-hand route over the crumbling ledge and under the
      // orbit is still there and still the short way.
      { col: 36, row: 16, width: 4 },
      { col: 34, row: 13, width: 6 },
    ],
    playerStartCol: 2,
    exitCol: 36,
    exitRow: 13,
    traps: [

      // Moved clear of the platform overhead. A trigger band is five tiles
      // tall now — it has to be, to catch a player jumping across it
      // (`APPROACH_BAND_TILES`) — and at the old column it reached up into
      // the ledge above, so simply standing on that ledge spent the trap
      // on nobody.
      ...dropSpike('dspike-01', 44, 21, 22),
      // Cross a pit on stones that fall, climb past a ledge that is not
      // there, and do both under a spike that never stops. Nothing new is
      // introduced — the sector's four ideas are simply asked together.
      { type: 'falling-platform', id: 'flp-01', col: 19, row: 19, width: 3 },
      { type: 'falling-platform', id: 'flp-02', col: 26, row: 19, width: 3 },
      { type: 'disappearing-platform', id: 'dp-01', col: 29, row: 16, width: 3 },
      // Columns 30-33, not 26-29: at 26 it hung over the pit, and a decoy
      // drawn with the real slab's own texture may never stand over
      // anything that can kill (`tests/level-def-sanity.test.ts`). Here it
      // reads as the exit tier continuing to the left — the obvious hop up
      // from `dp-01` — and falling through it drops the player on solid
      // ground below the climb, which costs the tier and nothing else.
      { type: 'fake-platform', id: 'fakep-01', col: 30, row: 13, width: 4 },
      { type: 'orbit-spike', id: 'orbit-01', pivotCol: 33, pivotRow: 16, radiusTiles: 1.75, periodMs: 2000 },
      { type: 'electric-floor', id: 'ef-01', col: 13, width: 4, row: 22 },
    ],
  },
];
