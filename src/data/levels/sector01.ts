import type { LevelDef } from '@/gameplay/LevelDef';

/**
 * SECTOR 01 — SYSTEM BOOT. The ground is not your friend.
 *
 * Teaching order, one new idea per level, each one physical enough to read
 * without being explained: something drops you, something chases across your
 * path, something takes the floor away and puts it back somewhere else. Only
 * once all three are known does the sector ask for height.
 *
 *   01 BOOT    — move, jump, and one thing that kills you and is remembered
 *   02 DROP    — the floor gives way under your feet
 *   03 PATROL  — a spike that moves across your path
 *   04 SHIFT   — the hole in the floor moves
 *   05 ASCENT  — up, and the exit is up there too
 *   06 BOOT COMPLETE — all four at once
 *
 * ONE SCREEN. Every level here is `LEVEL_WIDTH_TILES` wide and the camera
 * never moves (`LevelDef`, `GameplayScene.setupCameras`), so the player sees
 * the whole problem before touching the controls. Levels are read first and
 * executed second — which is why a hazard can kill on first contact and
 * still be fair.
 *
 * FIRST MANDATORY DYNAMIC HAZARD (`sector-01-level-01`, `mspike-01`, right
 * after the first gap). Direct request from the project owner, refined twice
 * in the asking: the campaign needed a moment, near the very start, where
 * the player actually dies to something and remembers the spot — not just
 * static geometry you eyeball once and never think about again — and
 * specifically wanted it *invisible* until it ambushes, not another slow
 * visible patrol.
 *
 * `ambush: true` (`TrapDef.ts`/`AmbushSpikeTrap.ts`) is not the ordinary
 * `moving-spike`: invisible while idle, then it visibly drops fast and lands
 * lethal. What makes "invisible until it ambushes" still honest under
 * CLAUDE.md #4.2 (≥250ms visible warning before anything can kill you) is
 * where the line between "visible" and "lethal" falls: the entire fall —
 * from the moment it appears to the moment it lands — *is* the warning phase
 * (`timing.warningMs: 500`, double the `MIN_WARNING_MS` floor); `isLethal()`
 * only turns true once `active` begins, timed to start as the drop finishes.
 *
 * TRIGGERED BY POSITION, NOT BY A TIMER. Its trigger sits exactly
 * `AMBUSH_TRIGGER_LEAD` columns before the landing column — 55px from the
 * trigger's centre, which is `moveSpeed` (110px/s) times `warningMs`
 * (500ms) — so a player who crosses it and keeps running at normal speed
 * with no reaction arrives exactly as it lands. Stopping during the visible
 * fall is what survives it. That offset is the contract; moving the spike
 * means moving the trigger with it.
 */

/** The ambush spike's honest cycle — see the file doc comment. */
const AMBUSH_TIMING = { idleMs: 900, warningMs: 500, activeMs: 300, cooldownMs: 250 } as const;

/** Columns between an ambush trigger's left edge and its spike's column — `moveSpeed × warningMs` measured from the trigger's centre. */
const AMBUSH_TRIGGER_LEAD = 6;

export const SECTOR_01_LEVELS: LevelDef[] = [
  {
    id: 'sector-01-level-01',
    name: 'BOOT',
    width: 48,
    groundRow: 22,
    // One gap, wide enough to need a real jump and narrow enough that a
    // held run-and-jump clears it without thinking. The tutorial hints
    // (`TutorialHints`, wired to this level id in `GameplayScene`) land in
    // the flat run before it with nothing competing for attention.
    gaps: [[16, 18]],
    // The level's second beat, and an ordinary one: a static pair on
    // obviously solid ground with room to land either side, after the
    // ambush has already taught that the floor is not automatically safe.
    spikeColumns: [36, 37],
    platforms: [],
    playerStartCol: 2,
    exitCol: 43,
    traps: [
      {
        type: 'moving-spike',
        id: 'mspike-01',
        ambush: true,
        fromCol: 28,
        fromRow: 11,
        toCol: 28,
        toRow: 21,
        timing: AMBUSH_TIMING,
        loop: false,
      },
      // `visible: false` — every other trigger in the campaign shows a
      // faint ground marker; this one hides even that. It does not touch
      // honesty (CLAUDE.md #4.2 requires telegraphing the lethal state, not
      // the existence of a trigger) — the spike's own warning phase still
      // fires before it can kill.
      {
        type: 'trigger',
        id: 'mspike-01-trigger',
        col: 28 - AMBUSH_TRIGGER_LEAD,
        row: 19,
        width: 2,
        height: 3,
        targetId: 'mspike-01',
        visible: false,
      },
    ],
  },
  {
    id: 'sector-01-level-02',
    name: 'DROP',
    width: 48,
    groundRow: 22,
    // Three stretches of floor that are not floor. Each one is an ordinary
    // ground tile until it is stood on, then it shakes for 350ms — well
    // past the `MIN_WARNING_MS` floor — and falls away into the pit it was
    // covering.
    //
    // The ramp is built into the widths. The first two are narrow enough to
    // jump outright, so a cautious player can refuse them and a curious one
    // can find out what they do for free. The third is six columns — 60px
    // against a 57.9px jump — so it cannot be refused, and by then the
    // player knows exactly what standing still on it costs.
    gaps: [
      [12, 13],
      [22, 24],
      [33, 38],
    ],
    spikeColumns: [],
    platforms: [],
    playerStartCol: 2,
    exitCol: 43,
    traps: [
      { type: 'falling-platform', id: 'flp-01', col: 12, row: 22, width: 2 },
      { type: 'falling-platform', id: 'flp-02', col: 22, row: 22, width: 3 },
      { type: 'falling-platform', id: 'flp-03', col: 33, row: 22, width: 6 },
    ],
  },
  {
    id: 'sector-01-level-03',
    name: 'PATROL',
    width: 48,
    groundRow: 22,
    gaps: [],
    spikeColumns: [9, 10],
    // Two honest routes across the same stretch, which is what gives
    // `DifficultyDirector` something to observe and vary later (CLAUDE.md
    // #6 — "персональнее, а не сложнее"): time the patrol and walk under
    // it, or take the two ledges over it. Neither is strictly better; the
    // ground is shorter, the ledges are safer.
    platforms: [
      { col: 16, row: 19, width: 5 },
      { col: 26, row: 19, width: 5 },
    ],
    playerStartCol: 2,
    exitCol: 43,
    traps: [
      // Always visible, never hurrying — the honest opposite of level 01's
      // ambush, and the pairing is the point: one hazard that hides and one
      // that never does, so "watch it and go" is learned right after "stop
      // when something falls".
      {
        type: 'moving-spike',
        id: 'mspike-01',
        fromCol: 14,
        fromRow: 21,
        toCol: 32,
        toRow: 21,
        travelMs: 3000,
      },
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
    // hole rather than the bridge — the player is not waiting for transport,
    // they are being asked to stand where the floor currently is.
    //
    // Deliberately unjumpable end to end (the pit is 200px against a 57.9px
    // jump) so the slab cannot be skipped, and deliberately slow: the whole
    // sweep takes three seconds, which is long enough to watch it once
    // before stepping on.
    gaps: [[14, 33]],
    spikeColumns: [8, 9],
    platforms: [],
    playerStartCol: 2,
    exitCol: 43,
    traps: [
      {
        type: 'moving-platform',
        id: 'movp-01',
        fromCol: 14,
        fromRow: 22,
        toCol: 20,
        toRow: 22,
        width: 14,
        travelMs: 3000,
      },
    ],
  },
  {
    id: 'sector-01-level-05',
    name: 'ASCENT',
    width: 48,
    groundRow: 22,
    gaps: [],
    // Directly under the middle of the climb. Falling off a tier costs the
    // climb; falling off it *here* costs the attempt. Visible from the
    // spawn point, and the player steers in the air, so it is always a
    // choice rather than a punishment for being high up.
    spikeColumns: [20, 21],
    // The sector's vertical lesson, and the shape every later climb reuses:
    // three rows of rise per hop (30px against a 34.7px ceiling on a
    // full-held jump) and three empty columns across (30px against the
    // 40.6px that same jump covers while gaining three rows). Verified live
    // — the take-off window is about 100ms wide, which is committing to the
    // jump rather than hitting a frame.
    platforms: [
      { col: 10, row: 19, width: 4 },
      { col: 17, row: 16, width: 4 },
      { col: 24, row: 13, width: 4 },
      { col: 31, row: 10, width: 4 },
      { col: 38, row: 7, width: 5 },
    ],
    playerStartCol: 2,
    exitCol: 40,
    // First exit off the ground in the campaign: the level's whole question
    // becomes "how do I get up there", asked before the player moves.
    exitRow: 7,
  },
  {
    id: 'sector-01-level-06',
    name: 'BOOT COMPLETE',
    width: 48,
    groundRow: 22,
    // The sector's four ideas in one screen and in the order they were
    // taught: a sliding floor to cross, a pit under the climb where the
    // floor gives way, a patrol guarding the first tier, and the exit at
    // the top so none of it can be outrun along the ground.
    gaps: [
      [16, 21],
      [35, 37],
    ],
    spikeColumns: [10, 11],
    platforms: [
      { col: 26, row: 19, width: 5 },
      { col: 33, row: 16, width: 5 },
      { col: 40, row: 13, width: 6 },
    ],
    playerStartCol: 2,
    exitCol: 42,
    exitRow: 13,
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
      { type: 'falling-platform', id: 'flp-01', col: 35, row: 22, width: 3 },
      {
        type: 'moving-spike',
        id: 'mspike-01',
        fromCol: 27,
        fromRow: 18,
        toCol: 33,
        toRow: 18,
        travelMs: 2000,
      },
    ],
  },
];
