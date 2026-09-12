import type { LevelDef } from '@/gameplay/LevelDef';

/**
 * SECTOR 01 — SYSTEM BOOT. The whole vocabulary, one word at a time: move,
 * jump a gap, read a static spike, climb, and one thing that actually kills
 * you and is remembered for it.
 *
 * ONE SCREEN. Every level here is `LEVEL_WIDTH_TILES` wide and the camera
 * never moves (`LevelDef`, `GameplayScene.setupCameras`), so the player sees
 * the whole problem before touching the controls. Levels are read first and
 * executed second — which is why difficulty can come from precision and
 * timing without ever becoming unfair.
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

/** The ambush spike's honest cycle — see the file doc comment. Shared so the two placements can't drift apart. */
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
    // 40.6px that same jump covers while gaining three rows). Comfortably
    // inside both limits, so the ladder is about committing to the jump,
    // not about frame-perfect spacing.
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
    id: 'sector-01-level-03',
    name: 'TEETH',
    width: 48,
    groundRow: 22,
    gaps: [
      [12, 15],
      [24, 27],
      [35, 37],
    ],
    spikeColumns: [19, 20, 31, 32],
    platforms: [],
    playerStartCol: 2,
    exitCol: 43,
    traps: [
      // A slow, always-visible patrol over the middle pit — the honest
      // opposite of level 01's ambush, and the pairing is the point: one
      // hazard that hides and one that never does, so "watch it and go" is
      // learned right after "stop when something falls".
      {
        type: 'moving-spike',
        id: 'mspike-01',
        fromCol: 23,
        fromRow: 19,
        toCol: 29,
        toRow: 19,
        travelMs: 2200,
      },
    ],
  },
  {
    id: 'sector-01-level-04',
    name: 'OVERHANG',
    width: 48,
    groundRow: 22,
    // The pit under the middle of the climb: the tier chain crosses it, and
    // missing a hop there is a death rather than a re-climb. It is directly
    // below the two tightest jumps in the level and plainly visible from
    // the spawn.
    gaps: [[20, 24]],
    spikeColumns: [13, 14],
    platforms: [
      { col: 8, row: 19, width: 3 },
      { col: 14, row: 16, width: 3 },
      { col: 20, row: 13, width: 4 },
      // The descent. A climb that only ever goes up is one idea repeated;
      // stepping back down to get further right makes the player read the
      // shape rather than mash jump.
      { col: 28, row: 16, width: 3 },
      { col: 34, row: 13, width: 4 },
      { col: 40, row: 10, width: 5 },
    ],
    playerStartCol: 2,
    exitCol: 41,
    exitRow: 10,
  },
  {
    id: 'sector-01-level-05',
    name: 'PATROL',
    width: 48,
    groundRow: 22,
    gaps: [],
    spikeColumns: [8, 9],
    // Two honest routes across the same stretch, which is what gives
    // `DifficultyDirector` something to observe and vary later (CLAUDE.md
    // #6 — "персональнее, а не сложнее"): duck along the ground and time
    // the patrol, or climb the tiers and walk over it. Neither is strictly
    // better; the ground is shorter, the tiers are safer.
    platforms: [
      { col: 12, row: 19, width: 4 },
      { col: 19, row: 16, width: 5 },
      { col: 27, row: 16, width: 5 },
      { col: 35, row: 19, width: 4 },
    ],
    playerStartCol: 2,
    exitCol: 43,
    traps: [
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
    id: 'sector-01-level-06',
    name: 'BOOT COMPLETE',
    width: 48,
    groundRow: 22,
    // Everything the sector taught, in one screen: a gap to clear, spikes
    // to read, a patrol to time and a climb to finish on. The exit is at
    // the top, so the patrol has to be beaten on the way *through* rather
    // than outrun to a door on the same floor.
    gaps: [[17, 20]],
    spikeColumns: [10, 11, 27, 28],
    platforms: [
      { col: 22, row: 19, width: 4 },
      { col: 29, row: 16, width: 4 },
      { col: 36, row: 13, width: 4 },
      { col: 41, row: 10, width: 5 },
    ],
    playerStartCol: 2,
    exitCol: 42,
    exitRow: 10,
    traps: [
      {
        type: 'moving-spike',
        id: 'mspike-01',
        fromCol: 30,
        fromRow: 15,
        toCol: 36,
        toRow: 15,
        travelMs: 1900,
      },
      // Deliberately in the air at row 19 rather than along row 21, where
      // the static spikes at 10-11 already sit: a patrol sharing their row
      // reads as one smeared hazard instead of two things to solve. Up
      // here it is the jump *over* the spikes that has to be timed, which
      // is the sector's two lessons asked as one question.
      {
        type: 'moving-spike',
        id: 'mspike-02',
        fromCol: 5,
        fromRow: 19,
        toCol: 16,
        toRow: 19,
        travelMs: 2600,
      },
    ],
  },
];
