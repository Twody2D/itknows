import type { LevelDef } from '@/gameplay/LevelDef';
import type { LevelSectionConfig } from '@/gameplay/LevelSections';

/**
 * SECTOR 03 — INDUSTRIAL CORE. Lasers (master-prompt §23), teach → practice
 * → combine (§66):
 *
 * 01 PISTON ROW — two independent lasers in sequence (practice: "more than
 *    one" doesn't change the rule — wait, watch, go), plus a sudden-pit
 *    falling-platform ahead of the first laser (see the level's own
 *    doc comment).
 * 02 OFFSET — two lasers close together, deliberately out of phase
 *    (`initialIdleMs` on the second) so there's never a moment both read as
 *    safe by habit — has to actually be watched, not memorized.
 * 03 CATWALK — laser (mandatory) + moving-platform bypass (optional, same
 *    pattern as sector 02) in the same level.
 * 04 DELAY LINE — trigger-armed one-shot lasers, twice, reinforcing that a
 *    trigger's effect can be far from the trigger itself (sector 02 taught
 *    this once; this is the "practice" pass).
 * 05 PRESSURE VALVE — electric floor then a laser: two independently honest
 *    wait-then-cross hazards back to back ("layered", not "combined" —
 *    each still telegraphs and resolves on its own).
 * 06 CORE ACCESS — sector finale: laser (mandatory) + moving-platform
 *    bypass (optional) over a longer spike cluster, plus one `laser-decoy`
 *    before it — master-prompt §15's "waited for the trap, it wasn't there
 *    / stopped waiting, it appears," landed as fixed campaign content
 *    rather than a `DifficultyDirector` variant (every player hits both
 *    halves of this beat once, in order, not just players matching some
 *    measured habit). Only placed here, after 5 levels of "every laser you
 *    see is real" — subverting an expectation the sector spent that long
 *    actually earning is what makes it land as a trick and not a mystery.
 *

 * Every elevated bonus platform sits at `row 20` (2 tiles above
 * `groundRow`), never `row 18` — see sector 02's file doc comment and
 * `docs/technical-architecture.md` for why `row 18` is physically
 * unreachable (`MAX_JUMP_RISE_PX`). Every level's first hazard is ~18-20
 * tiles from spawn, matching every level in sectors 01-02 — not tighter
 * just because this is a later sector (CLAUDE.md #4).
 *
 * No pursuer appears in this sector. A pursuer forces continuous forward
 * motion; a laser can honestly require *waiting*. Combining the two risks
 * a wait that gets the player caught — exactly the kind of unverified
 * interaction CLAUDE.md #4 rules out shipping without hand-verification,
 * so it's avoided by construction rather than gambled on.
 */
export const SECTOR_03_LEVELS: LevelDef[] = [
  {
    id: 'sector-03-level-01',
    name: 'PISTON ROW',
    // Widened from 56: a level narrower than MAX_VIRTUAL_WIDTH leaves empty
    // void past the world edge on the widest viewports (`tests/level-def-
    // sanity.test.ts`'s width check). The extra length is flat ground added
    // past the existing exit — every trap/spike/platform position below is
    // untouched.
    width: 64,
    groundRow: 22,
    // A "sudden pit" — the ordinary campaign's `falling-platform` (already
    // proven honest in sector 04's FREEFALL, `col`/`row` right on the
    // ground row instead of an elevated row 20 bypass) used here as a
    // genuine surprise instead of a themed, telegraphed section: right
    // after the spike lesson lands and before the sector's own laser
    // lesson starts, so nothing else is competing for attention when it
    // first appears. Visually identical to ordinary ground (`tile-ground`
    // texture) until stepped on — same honest 350ms shake telegraph as
    // every other falling-platform, comfortably above `MIN_WARNING_MS`.
    // Keep moving off it and it never falls; loiter and it does.
    gaps: [[24, 25]],
    spikeColumns: [18, 19],
    platforms: [],
    playerStartCol: 2,
    exitCol: 52,
    traps: [
      { type: 'falling-platform', id: 'flp-ambush-01', col: 24, row: 22, width: 2 },
      { type: 'laser', id: 'laser-01', col: 30, topRow: 16, bottomRow: 21 },
      { type: 'laser', id: 'laser-02', col: 44, topRow: 16, bottomRow: 21 },
    ],
    sections: [
      { id: 'intro', type: 'intro', fromCol: 0, toCol: 13, requiredMechanics: ['move'] },
      { id: 'spikes', type: 'challenge', fromCol: 14, toCol: 21, requiredMechanics: ['spike-jump'] },
      {
        id: 'lasers',
        type: 'system',
        fromCol: 22,
        toCol: 45,
        requiredMechanics: ['gap-jump', 'falling-platform', 'laser'],
      },
      { id: 'exit', type: 'final', fromCol: 46, toCol: 63 },
    ] satisfies LevelSectionConfig[],
  },
  {
    id: 'sector-03-level-02',
    name: 'OFFSET',
    width: 64,
    groundRow: 22,
    gaps: [],
    spikeColumns: [18, 19],
    platforms: [],
    playerStartCol: 2,
    exitCol: 50,
    traps: [
      { type: 'laser', id: 'laser-01', col: 34, topRow: 16, bottomRow: 21 },
      // Same timing shape, deliberately out of phase (roughly half a cycle
      // later) — there's no fixed "safe beat" that works for both; it has
      // to be watched. Both are still independently honest (default
      // warningMs), and there's always room to wait clear of both before
      // committing to cross.
      { type: 'laser', id: 'laser-02', col: 40, topRow: 16, bottomRow: 21, initialIdleMs: 1150 },
    ],
    sections: [
      { id: 'intro', type: 'intro', fromCol: 0, toCol: 13, requiredMechanics: ['move'] },
      { id: 'spikes', type: 'challenge', fromCol: 14, toCol: 21, requiredMechanics: ['spike-jump'] },
      { id: 'lasers', type: 'system', fromCol: 22, toCol: 45, requiredMechanics: ['laser'] },
      { id: 'exit', type: 'final', fromCol: 46, toCol: 63 },
    ] satisfies LevelSectionConfig[],
  },
  {
    id: 'sector-03-level-03',
    name: 'CATWALK',
    width: 64,
    groundRow: 22,
    gaps: [],
    spikeColumns: [18, 19, 30, 31, 32, 33],
    platforms: [],
    playerStartCol: 2,
    exitCol: 54,
    traps: [
      // Optional elevated bypass over the spike cluster — ground path
      // underneath (jump the spikes) is always available.
      {
        type: 'moving-platform',
        id: 'bridge-01',
        fromCol: 26,
        fromRow: 20,
        toCol: 36,
        toRow: 20,
        width: 2,
        travelMs: 2600,
      },
      { type: 'laser', id: 'laser-01', col: 46, topRow: 16, bottomRow: 21 },
    ],
    sections: [
      { id: 'intro', type: 'intro', fromCol: 0, toCol: 13, requiredMechanics: ['move'] },
      { id: 'spikes-1', type: 'challenge', fromCol: 14, toCol: 21, requiredMechanics: ['spike-jump'] },
      {
        id: 'bridge-spikes-2',
        type: 'variation',
        fromCol: 22,
        toCol: 41,
        optionalRoute: true,
        requiredMechanics: ['platform', 'spike-jump'],
      },
      { id: 'laser', type: 'system', fromCol: 42, toCol: 49, requiredMechanics: ['laser'] },
      { id: 'exit', type: 'final', fromCol: 50, toCol: 63 },
    ] satisfies LevelSectionConfig[],
  },
  {
    id: 'sector-03-level-04',
    name: 'DELAY LINE',
    width: 64,
    groundRow: 22,
    gaps: [],
    spikeColumns: [18, 19],
    platforms: [],
    playerStartCol: 2,
    exitCol: 54,
    traps: [
      // First trigger-armed one-shot laser. Harmless if never triggered or
      // if the player arrives after its cycle already finished (loop:
      // false — returns to idle for good, never a permanent block).
      { type: 'trigger', id: 'trig-01', col: 24, row: 19, width: 2, height: 3, targetId: 'laser-01' },
      { type: 'laser', id: 'laser-01', col: 32, topRow: 16, bottomRow: 21, loop: false },
      // Second instance of the same pattern, further along — reinforces
      // that a trigger's effect can be well ahead of the trigger itself,
      // not a one-off trick.
      { type: 'trigger', id: 'trig-02', col: 40, row: 19, width: 2, height: 3, targetId: 'laser-02' },
      { type: 'laser', id: 'laser-02', col: 48, topRow: 16, bottomRow: 21, loop: false },
    ],
    sections: [
      { id: 'intro', type: 'intro', fromCol: 0, toCol: 13, requiredMechanics: ['move'] },
      { id: 'spikes', type: 'challenge', fromCol: 14, toCol: 21, requiredMechanics: ['spike-jump'] },
      { id: 'trigger-laser-1', type: 'system', fromCol: 22, toCol: 35, requiredMechanics: ['trigger', 'laser'] },
      { id: 'trigger-laser-2', type: 'system', fromCol: 36, toCol: 49, requiredMechanics: ['trigger', 'laser'] },
      { id: 'exit', type: 'final', fromCol: 50, toCol: 63 },
    ] satisfies LevelSectionConfig[],
  },
  {
    id: 'sector-03-level-05',
    name: 'PRESSURE VALVE',
    width: 64,
    groundRow: 22,
    gaps: [],
    spikeColumns: [18, 19],
    platforms: [],
    playerStartCol: 2,
    exitCol: 52,
    traps: [
      { type: 'electric-floor', id: 'ef-01', col: 28, row: 22, width: 4 },
      { type: 'laser', id: 'laser-01', col: 42, topRow: 16, bottomRow: 21 },
    ],
    sections: [
      { id: 'intro', type: 'intro', fromCol: 0, toCol: 13, requiredMechanics: ['move'] },
      { id: 'spikes', type: 'challenge', fromCol: 14, toCol: 21, requiredMechanics: ['spike-jump'] },
      { id: 'electric-floor', type: 'system', fromCol: 22, toCol: 33, requiredMechanics: ['electric-floor'] },
      { id: 'laser', type: 'system', fromCol: 34, toCol: 47, requiredMechanics: ['laser'] },
      { id: 'exit', type: 'final', fromCol: 48, toCol: 63 },
    ] satisfies LevelSectionConfig[],
  },
  {
    id: 'sector-03-level-06',
    name: 'CORE ACCESS',
    width: 64,
    groundRow: 22,
    gaps: [],
    spikeColumns: [18, 19, 32, 33, 34, 35],
    platforms: [],
    playerStartCol: 2,
    exitCol: 56,
    traps: [
      // A laser that never arms — `loop: false` starts a trap disarmed
      // (`Trap`'s constructor: `this.armed = this.loop`), and nothing here
      // ever calls `.trigger()` on it, so it structurally *cannot* ever
      // leave `idle` (not "very unlikely to", a provable guarantee, not a
      // long timer standing in for one). Same idle-phase visual as every
      // other laser this sector (`LaserTrap`'s dim rectangle) — a player who
      // has learned every laser cue means real danger sees this one, waits
      // or watches for it exactly as trained, and it simply never fires.
      // The real one, unchanged below, is what master-prompt §15's "stopped
      // waiting for the trap → it appears" is actually testing: right after
      // the sector taught "this shape can be a bluff," `laser-01` is not.
      { type: 'laser', id: 'laser-decoy', col: 24, topRow: 16, bottomRow: 21, loop: false },
      {
        type: 'moving-platform',
        id: 'bridge-01',
        fromCol: 28,
        fromRow: 20,
        toCol: 38,
        toRow: 20,
        width: 2,
        travelMs: 2600,
      },
      { type: 'laser', id: 'laser-01', col: 48, topRow: 16, bottomRow: 21 },
    ],
    sections: [
      { id: 'intro', type: 'intro', fromCol: 0, toCol: 13, requiredMechanics: ['move'] },
      { id: 'spikes-1', type: 'challenge', fromCol: 14, toCol: 21, requiredMechanics: ['spike-jump'] },
      {
        id: 'bridge-spikes-2',
        type: 'variation',
        fromCol: 22,
        toCol: 41,
        optionalRoute: true,
        requiredMechanics: ['platform', 'spike-jump'],
      },
      { id: 'laser', type: 'system', fromCol: 42, toCol: 53, requiredMechanics: ['laser'] },
      { id: 'exit', type: 'final', fromCol: 54, toCol: 63 },
    ] satisfies LevelSectionConfig[],
  },
];
