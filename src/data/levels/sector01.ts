import type { LevelDef } from '@/gameplay/LevelDef';
import {
  AMBUSH_TIMING,
  AMBUSH_TRIGGER_LEAD,
  dropSpike,
  floorSpikes,
  shiftingPit,
  trapdoor,
} from './ambush';

/**
 * SECTOR 01 — SYSTEM BOOT. The ground is not your friend.
 *
 * EVERY HAZARD HERE SPRINGS. Direct request from the project owner, twice,
 * after watching the reference game in `ref/`: a floor that sinks slowly
 * under your feet asks nothing of you — you can simply keep running and it
 * never catches you, so it may as well not be there. What the sector runs
 * on instead is a trap that fires *at* you: you cross a line, the floor a
 * couple of columns ahead of you flashes red and drops out, and if you do
 * nothing about it you fall. Doing nothing is the failure state; that is
 * the whole design of this sector.
 *
 *   01 BOOT    — move, jump, and the first floor that springs
 *   02 DROP    — four trapdoors, nothing else on the screen
 *   03 PATROL  — one spike that never hides, one that waits for you
 *   04 SHIFT   — the hole in the floor moves
 *   05 ASCENT  — up, and something comes down while you climb
 *   06 BOOT COMPLETE — all of it at once
 *
 * ONE SCREEN. Every level here is `LEVEL_WIDTH_TILES` wide and the camera
 * never moves (`LevelDef`, `GameplayScene.setupCameras`), so the player sees
 * the whole problem before touching the controls. Levels are read first and
 * executed second — which is why a hazard can kill on first contact and
 * still be fair.
 *
 * WHY A SPRUNG TRAP IS STILL HONEST (CLAUDE.md #4.2/#4.5). Two numbers do
 * all the work, and every placement in this file is derived from them
 * rather than eyeballed:
 *
 *   - `TRAPDOOR_WARN_MS` (350ms) is how long a trapdoor shakes and flashes
 *     red while still carrying everything on it. That is the telegraph, and
 *     it is 100ms past the `MIN_WARNING_MS` floor.
 *   - `TRAPDOOR_LEAD` (4 columns) is how far before the trapdoor its
 *     trigger sits, and it is the reaction window written as geometry: at
 *     `moveSpeed` (110px/s) those 40px take ~360ms to run, so a player who
 *     crosses the line has more than `MIN_REACTION_WINDOW_MS` of solid
 *     ground left under them in which to decide.
 *
 * THE FLOOR IS GONE BEFORE THEY ARRIVE, NOT WHILE THEY STAND ON IT, and
 * that is deliberate — it is the only version of this trap that actually
 * kills. Springing it underfoot was tried first and measured live: a
 * running player crosses three columns in ~250ms, free fall moves them
 * barely 8px in that time, and they step onto solid ground on the far side
 * having wobbled and survived. Timed this way instead, they run into a hole
 * that opened a stride ahead of them, and 150ms into the pit they are
 * already below its lip with its far wall in front of them.
 *
 * WHICH LEAVES TWO HONEST ANSWERS, both worth the full window: stop, or
 * jump from the edge — three columns is 30px against a 57.9px jump, so the
 * jump is not a precision act once it is taken from the right place.
 *
 * `LevelValidator` deliberately counts no armed trapdoor as a surface, so
 * the solver proves each level passable with all of them already gone.
 * Falling is a mistake the player can see coming and fix; it is never a
 * dead end (CLAUDE.md #4.3/#4.4).
 *
 * THE FIRST MANDATORY HAZARD (`sector-01-level-01`, `mspike-01`) stays what
 * the owner asked for earlier: a spike that is *invisible* until it
 * ambushes, not another slow visible patrol. `ambush: true`
 * (`AmbushSpikeTrap`) keeps that honest the same way — the entire visible
 * fall is the warning phase (`warningMs: 500`, double the floor) and
 * `isLethal()` only turns true as it lands. Its trigger sits
 * `AMBUSH_TRIGGER_LEAD` columns ahead for the same reason the trapdoors'
 * do: 55px is `moveSpeed` × `warningMs`, so a player who crosses it and
 * keeps running arrives exactly as the spike lands. That offset is a
 * contract — moving the spike means moving the trigger with it.
 */

export const SECTOR_01_LEVELS: LevelDef[] = [
  {
    id: 'sector-01-level-01',
    name: 'BOOT',
    width: 48,
    groundRow: 22,
    // Read left to right, this is the sector in miniature: a plain pit that
    // teaches the jump, an invisible spike that teaches stopping, and a
    // trapdoor that teaches that floor is a claim, not a fact.
    gaps: [
      [14, 16],
      [34, 36],
    ],
    spikeColumns: [],
    platforms: [],
    playerStartCol: 2,
    exitCol: 43,
    traps: [
      {
        type: 'moving-spike',
        id: 'mspike-01',
        ambush: true,
        fromCol: 26,
        fromRow: 11,
        toCol: 26,
        toRow: 21,
        timing: AMBUSH_TIMING,
        loop: false,
      },
      {
        type: 'trigger',
        id: 'mspike-01-trigger',
        col: 26 - AMBUSH_TRIGGER_LEAD,
        row: 19,
        width: 2,
        height: 3,
        targetId: 'mspike-01',
      },
      // The sector's main idea, met once, at its plainest: a long clear
      // run-up, nothing else on screen, and the whole flash visible before
      // the floor goes.
      ...trapdoor('flp-01', 34, 3),
    ],
  },
  {
    id: 'sector-01-level-02',
    name: 'DROP',
    width: 48,
    groundRow: 22,
    // FOUR TRAPDOORS AND NOTHING ELSE. No spikes, no patrols, no climb —
    // the level is one idea repeated until it is a reflex, which is what
    // the owner asked for after the old "floor sinks slowly underfoot"
    // version turned out to be something a running player never even
    // noticed.
    //
    // The ramp is in the spacing, not in the widths — every trapdoor in
    // the campaign is three columns for the reason in the file doc comment
    // (it is what keeps jumping on the flash a working answer). The first
    // two stand alone with long flat runs either side, so there is room to
    // panic and recover. The last two are a pair with a four-column landing
    // strip between them, which is exactly one trigger wide: clearing the
    // first pit puts the player down on the second one's line, and the
    // floor ahead opens while they are still absorbing the landing. That is
    // the moment the sector is built around.
    gaps: [
      [12, 14],
      [22, 24],
      [32, 34],
      [39, 41],
    ],
    spikeColumns: [],
    platforms: [],
    playerStartCol: 2,
    exitCol: 43,
    traps: [
      ...trapdoor('flp-01', 12, 3),
      ...trapdoor('flp-02', 22, 3),
      ...trapdoor('flp-03', 32, 3),
      ...trapdoor('flp-04', 39, 3),
    ],
  },
  {
    id: 'sector-01-level-03',
    name: 'PATROL',
    width: 48,
    groundRow: 22,
    gaps: [],
    spikeColumns: [],
    // Two honest routes across the patrol's stretch, which is what gives
    // `DifficultyDirector` something to observe and vary later (CLAUDE.md
    // #6 — "персональнее, а не сложнее"): time it and walk under, or take
    // the two ledges over it. Neither is strictly better; the ground is
    // shorter, the ledges are safer.
    platforms: [
      { col: 16, row: 19, width: 5 },
      { col: 26, row: 19, width: 5 },
    ],
    playerStartCol: 2,
    exitCol: 43,
    traps: [
      // Always visible, never hurrying — the honest opposite of the bank
      // waiting at the end of the level, and the pairing is the point: one
      // spike you watch and walk past, one that is not there until you
      // walk into where it will be.
      {
        type: 'moving-spike',
        id: 'mspike-01',
        fromCol: 14,
        fromRow: 21,
        toCol: 32,
        toRow: 21,
        travelMs: 3000,
      },
      // Spikes that punch up out of the floor when the player crosses the
      // line six columns earlier — `loop: false`, so it never fires on a
      // clock, only on approach. The 500ms warning is `moveSpeed × lead`
      // again: run straight at it and it is lethal exactly as you arrive.
      // Stopping, or jumping the three-column span, both clear it.
      ...floorSpikes('sbank-01', 38, 3, 22),
      // And one more the other way round: the walk back from the patrol
      // spike, which until now was the safe half of the level.
      // Column 34, not 24: at 24 it landed in the middle of the patrol
      // route and the two hazards shared the tile, so whichever arrived
      // first was the only one the player ever met. Past the patrol's right
      // turn it is the ambush the comment above describes and nothing is
      // hiding inside anything else.
      ...dropSpike('dspike-01', 34, 21, 22),
    ],
  },
  {
    id: 'sector-01-level-04',
    name: 'SHIFT',
    width: 48,
    groundRow: 22,
    // THE HOLE IN THE FLOOR MOVES. A twenty-column pit with a fourteen-
    // column slab sliding along it: the floor is mostly there, and the gap
    // in it walks from one end to the other. It is the same
    // `moving-platform` every bridge uses, sized so that what reads is the
    // hole rather than the bridge — the player is not waiting for
    // transport, they are being asked to stand where the floor currently
    // is.
    //
    // Deliberately unjumpable end to end (180px against a 57.9px jump) so
    // the slab cannot be skipped, and deliberately slow: the whole sweep
    // takes three seconds, long enough to watch it once before stepping on.
    //
    // The trapdoor on the approach is what stops that watching from being
    // free. It springs while the player is still walking up to the pit, so
    // the first read of the moving hole happens from the far side of a
    // hole that just appeared.
    //
    // AND THEN IT MOVES ONCE, ON PURPOSE, AT YOU. Past the bridge there is
    // a second pit with a three-column slab parked over its right half, so
    // what the player reads on approach is a hole to jump and a ledge to
    // land on. Crossing the bridge arms it: the slab slides left, filling
    // the hole and opening the landing — "видишь дырку, перепрыгиваешь её,
    // а она в этот момент передвигается на место, куда ты прыгал" (owner).
    // It finishes moving while they are still riding the bridge with the
    // take-off several columns away, which is the whole reason it is
    // allowed to exist (see `shiftingPit`).
    gaps: [
      [10, 12],
      [16, 33],
      [36, 41],
    ],
    spikeColumns: [],
    platforms: [],
    playerStartCol: 2,
    exitCol: 43,
    traps: [
      ...trapdoor('flp-01', 10, 3),
      {
        type: 'moving-platform',
        id: 'movp-01',
        fromCol: 16,
        fromRow: 22,
        toCol: 20,
        toRow: 22,
        width: 14,
        travelMs: 3000,
      },
      // Six columns of lead, not fourteen. At fourteen the band reached
      // right back across the bridge, so the hole finished moving while the
      // player was still halfway along the ride with their eyes on the far
      // bank — the trap happened, correctly and invisibly, somewhere they
      // were not looking, which is a large part of why the owner reported
      // never having met it. Six is 545ms of approach against a 420ms
      // shift: still finished before the take-off, and now close enough to
      // watch. Any shorter and the hole would move under someone already in
      // the air, which is a coin toss rather than a trap.
      ...shiftingPit('sp-01', 39, 36, 3, 22, { lead: 6 }),
    ],
  },
  {
    id: 'sector-01-level-05',
    name: 'ASCENT',
    width: 48,
    groundRow: 22,
    // The run-up is wired. Everything the player has learned about floors
    // applies on the ground; none of it applies once they are on the
    // ladder, which is the point of putting the trapdoor first.
    gaps: [[12, 14]],
    // Directly under the gap the climb zig-zags across. Falling off a tier
    // costs the climb; falling off it *here* costs the attempt. Visible
    // from the spawn point, and the player steers in the air, so it is
    // always a choice rather than a punishment for being high up.
    spikeColumns: [24, 25],
    // The sector's vertical lesson, and the shape every later climb reuses:
    // three rows of rise per hop (30px against a 34.7px ceiling on a
    // full-held jump) and three empty columns across (30px against the
    // 40.6px that same jump covers while gaining three rows). Verified live
    // — the take-off window is about 100ms wide, which is committing to the
    // jump rather than hitting a frame.
    //
    // It zig-zags rather than marching right for a reason the screen makes
    // obvious: a straight staircase at this pitch runs out of level and
    // parks the exit in the top-right corner, under the pause button.
    // Turning back on itself keeps the whole climb, and the door, in the
    // middle of the screen where they can be read.
    platforms: [
      { col: 20, row: 19, width: 4 },
      { col: 27, row: 16, width: 4 },
      { col: 20, row: 13, width: 4 },
      { col: 27, row: 10, width: 4 },
      { col: 20, row: 7, width: 4 },
    ],
    playerStartCol: 2,
    exitCol: 21,
    // First exit off the ground in the campaign: the level's whole question
    // becomes "how do I get up there", asked before the player moves.
    exitRow: 7,
    traps: [
      ...trapdoor('flp-01', 12, 3),
      // SOMETHING COMES DOWN WHILE YOU ARE CLIMBING. The level was a clean
      // staircase and nothing else, which the owner found flat ("ascent
      // недостаточно игривый, можно сделать, чтобы шип сверху упал, когда я
      // забирался наверх"). Landing on the second tier arms a spike that
      // drops onto the *next* one — visible for the whole 500ms fall, and
      // lethal only once it has landed, so what it costs is the jump the
      // player was about to make, not the jump they are in.
      //
      // COLUMN 23, NOT 21: the tier is `col 20 width 4`, and a player
      // arriving from the tier on the right lands on its far edge — 40.6px
      // of reach at a three-row rise puts them at column 23 and no further.
      // At column 21 the spike came down on the two columns of that ledge
      // nobody ever stands on, which is why it read as unrelated to the
      // player ("шип падает независимо от того, где я" — owner). On column
      // 23 it lands on the exact tile the next hop needs, in full view,
      // while the player is still standing safely on the tier below.
      //
      // `activeMs: 1200` is the actual puzzle: it sits there, on the tile
      // the route needs, long enough that waiting is a real decision on a
      // ledge four rows above a spike bed. Then it withdraws and the climb
      // continues.
      {
        type: 'moving-spike',
        id: 'mspike-01',
        ambush: true,
        fromCol: 23,
        fromRow: 8,
        toCol: 23,
        toRow: 12,
        timing: { idleMs: 900, warningMs: 500, activeMs: 1200, cooldownMs: 400 },
        loop: false,
      },
      { type: 'trigger', id: 'mspike-01-trigger', col: 27, row: 14, width: 4, height: 2, targetId: 'mspike-01' },
    ],
  },
  {
    id: 'sector-01-level-06',
    name: 'BOOT COMPLETE',
    width: 48,
    groundRow: 22,
    // The sector's four ideas in one screen and in the order they were
    // taught: a sliding floor to cross, a patrol to time, a trapdoor that
    // springs on the approach, and the climb to the exit on the far side of
    // it — so the trapdoor cannot be walked around, only dealt with. The
    // climb turns back over the pit it just crossed, which is what puts the
    // exit in the middle of the screen instead of hard against the wall,
    // and what stops the first tier from being reachable off the near
    // ground (five columns at a three-row rise is 50px against a 40.6px
    // reach — the solver checks this, it is not a guess).
    gaps: [
      [16, 21],
      [35, 37],
    ],
    spikeColumns: [10, 11],
    platforms: [
      { col: 40, row: 19, width: 4 },
      { col: 33, row: 16, width: 4 },
    ],
    playerStartCol: 2,
    exitCol: 34,
    exitRow: 16,
    traps: [
      {
        type: 'moving-platform',
        id: 'movp-01',
        fromCol: 16,
        fromRow: 22,
        toCol: 18,
        toRow: 22,
        width: 4,
        travelMs: 2400,
      },
      {
        type: 'moving-spike',
        id: 'mspike-01',
        fromCol: 24,
        fromRow: 21,
        toCol: 32,
        toRow: 21,
        travelMs: 2000,
      },
      ...trapdoor('flp-01', 35, 3),
    ],
  },
];
