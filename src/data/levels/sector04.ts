import type { LevelDef } from '@/gameplay/LevelDef';
import type { LevelSectionConfig } from '@/gameplay/LevelSections';

/**
 * SECTOR 04 — DATA DISTRICT. Timing traps (master-prompt §23): the
 * timing gate (blocks, never kills — `TimingGate.ts`) and the two
 * "don't linger" platforms (disappearing/falling), teach → practice →
 * combine (§66):
 *
 * 01 SYNC GATE — two timing gates in sequence (practice: more than one
 *    doesn't change the rule — wait for green, go), plus a sudden-pit
 *    falling-platform ahead of the first gate — before this sector's own
 *    falling-platform lesson (level 04) ever teaches the mechanic formally.
 * 02 RHYTHM — two gates with genuinely different cycle speeds (one fast,
 *    one slow custom `timing`), so there's no single rhythm to memorize —
 *    each has to be watched on its own terms — plus an ambush spike ahead
 *    of the first gate (see sector01-level-01's doc comment).
 * 03 CRUMBLE RUN — three disappearing platforms back to back across one
 *    wide gap: keep moving, don't stop on any single one.
 * 04 FREEFALL — two falling platforms back to back across a gap — the
 *    other "don't linger" mechanic, same safety margin, different tell
 *    (shake-then-drop instead of flicker-then-vanish).
 * 05 LOCKSTEP — moving-platform bypass (optional, proven pattern) then a
 *    timing gate (mandatory) further down the same level — two
 *    already-taught mechanics in sequence, not fused into one interaction.
 * 06 ARCHIVE CORE — sector finale: trigger-armed laser (sector 03) +
 *    moving-platform bypass + a timing gate before the exit.
 *
 * Same rules as every sector so far: mandatory path only uses geometry
 * already proven fair or an honest wait-it-out hazard; first hazard is
 * ~18-20 tiles from spawn; elevated bonus platforms sit at `row 20`, never
 * `row 18` (CLAUDE.md #4; see sector 02's file doc comment for why). No
 * pursuer in this sector either, for the same reason sector 03 has none —
 * it forces motion, timing traps can honestly force waiting, and
 * combining the two is an unverified interaction this project doesn't
 * ship on a guess.
 */
export const SECTOR_04_LEVELS: LevelDef[] = [
  {
    id: 'sector-04-level-01',
    name: 'SYNC GATE',
    // Widened from 54 — see sector03.ts's level-01 doc comment for why.
    width: 64,
    groundRow: 22,
    // Sudden pit (see sector03.ts level-01's doc comment for the full
    // reasoning) — before this sector's own falling-platform lesson
    // (level 04, FREEFALL) ever teaches the mechanic formally, right after
    // the spike lesson and before the gate lesson starts.
    gaps: [[24, 25]],
    spikeColumns: [18, 19],
    platforms: [],
    playerStartCol: 2,
    exitCol: 50,
    traps: [
      { type: 'falling-platform', id: 'flp-ambush-01', col: 24, row: 22, width: 2 },
      { type: 'timing-gate', id: 'gate-01', col: 30, topRow: 16, bottomRow: 21 },
      { type: 'timing-gate', id: 'gate-02', col: 42, topRow: 16, bottomRow: 21 },
    ],
    sections: [
      { id: 'intro', type: 'intro', fromCol: 0, toCol: 13, requiredMechanics: ['move'] },
      { id: 'spikes', type: 'challenge', fromCol: 14, toCol: 21, requiredMechanics: ['spike-jump'] },
      {
        id: 'gates',
        type: 'system',
        fromCol: 22,
        toCol: 45,
        requiredMechanics: ['gap-jump', 'falling-platform', 'timing-gate'],
      },
      { id: 'exit', type: 'final', fromCol: 46, toCol: 63 },
    ] satisfies LevelSectionConfig[],
  },
  {
    id: 'sector-04-level-02',
    name: 'RHYTHM',
    width: 64,
    groundRow: 22,
    gaps: [],
    spikeColumns: [18, 19],
    platforms: [],
    playerStartCol: 2,
    exitCol: 50,
    traps: [
      // Ambush spike (see sector01-level-01's doc comment for the full
      // mechanism/honesty reasoning) — right after the spike lesson,
      // before this level's own gate lesson starts. Second campaign
      // instance: still a surprise here specifically because sector 04's
      // own mechanic is "wait it out"/"don't linger", not "something falls
      // on you out of nowhere" — this doesn't fit the pattern the sector
      // otherwise teaches, which is what keeps it landing as a surprise
      // rather than becoming the expected shape of every level's opening.
      {
        type: 'moving-spike',
        id: 'mspike-01',
        ambush: true,
        fromCol: 26,
        fromRow: 11,
        toCol: 26,
        toRow: 21,
        timing: { idleMs: 900, warningMs: 500, activeMs: 300, cooldownMs: 250 },
        loop: false,
      },
      {
        type: 'trigger',
        id: 'mspike-01-trigger',
        col: 20,
        row: 19,
        width: 2,
        height: 3,
        targetId: 'mspike-01',
        visible: false,
      },
      // Faster cycle — warningMs still well above MIN_WARNING_MS (250ms).
      {
        type: 'timing-gate',
        id: 'gate-01',
        col: 32,
        topRow: 16,
        bottomRow: 21,
        timing: { idleMs: 500, warningMs: 300, activeMs: 500, cooldownMs: 200 },
      },
      // Default (slower) cycle — deliberately different from gate-01 so
      // there's no shared beat to count instead of watching the gates.
      { type: 'timing-gate', id: 'gate-02', col: 40, topRow: 16, bottomRow: 21 },
    ],
    sections: [
      { id: 'intro', type: 'intro', fromCol: 0, toCol: 13, requiredMechanics: ['move'] },
      { id: 'spikes', type: 'challenge', fromCol: 14, toCol: 21, requiredMechanics: ['spike-jump'] },
      {
        id: 'gates',
        type: 'system',
        fromCol: 22,
        toCol: 45,
        requiredMechanics: ['moving-spike', 'timing-gate'],
      },
      { id: 'exit', type: 'final', fromCol: 46, toCol: 63 },
    ] satisfies LevelSectionConfig[],
  },
  {
    id: 'sector-04-level-03',
    name: 'CRUMBLE RUN',
    width: 64,
    groundRow: 22,
    gaps: [[26, 31]],
    spikeColumns: [18, 19],
    platforms: [],
    playerStartCol: 2,
    exitCol: 50,
    traps: [
      // Three in a row across one wide gap — each platform's crumble timer
      // only starts on its own contact, so as long as the player keeps
      // moving (never all three at once), every one is still comfortably
      // within its 350ms grace when they step off it.
      { type: 'disappearing-platform', id: 'dp-01', col: 26, row: 22, width: 2 },
      { type: 'disappearing-platform', id: 'dp-02', col: 28, row: 22, width: 2 },
      { type: 'disappearing-platform', id: 'dp-03', col: 30, row: 22, width: 2 },
    ],
    sections: [
      { id: 'intro', type: 'intro', fromCol: 0, toCol: 13, requiredMechanics: ['move'] },
      { id: 'spikes', type: 'challenge', fromCol: 14, toCol: 21, requiredMechanics: ['spike-jump'] },
      { id: 'crumble', type: 'combination', fromCol: 22, toCol: 35, requiredMechanics: ['gap-jump', 'disappearing-platform'] },
      { id: 'exit', type: 'final', fromCol: 36, toCol: 63 },
    ] satisfies LevelSectionConfig[],
  },
  {
    id: 'sector-04-level-04',
    name: 'FREEFALL',
    width: 64,
    groundRow: 22,
    gaps: [[26, 29]],
    spikeColumns: [18, 19],
    platforms: [],
    playerStartCol: 2,
    exitCol: 50,
    traps: [
      // Two falling platforms spanning the full gap — same "keep moving"
      // safety margin as CRUMBLE RUN's disappearing platforms (350ms
      // shake >> the ~360ms it takes to cross both at a walk), different
      // visual tell (shake-then-drop, not flicker-then-vanish).
      { type: 'falling-platform', id: 'flp-01', col: 26, row: 22, width: 2 },
      { type: 'falling-platform', id: 'flp-02', col: 28, row: 22, width: 2 },
    ],
    sections: [
      { id: 'intro', type: 'intro', fromCol: 0, toCol: 13, requiredMechanics: ['move'] },
      { id: 'spikes', type: 'challenge', fromCol: 14, toCol: 21, requiredMechanics: ['spike-jump'] },
      { id: 'freefall', type: 'combination', fromCol: 22, toCol: 33, requiredMechanics: ['gap-jump', 'falling-platform'] },
      { id: 'exit', type: 'final', fromCol: 34, toCol: 63 },
    ] satisfies LevelSectionConfig[],
  },
  {
    id: 'sector-04-level-05',
    name: 'LOCKSTEP',
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
      // Mandatory, further down the level — a separate obstacle, not fused
      // with the bridge above.
      { type: 'timing-gate', id: 'gate-01', col: 46, topRow: 16, bottomRow: 21 },
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
      { id: 'gate', type: 'system', fromCol: 42, toCol: 49, requiredMechanics: ['timing-gate'] },
      { id: 'exit', type: 'final', fromCol: 50, toCol: 63 },
    ] satisfies LevelSectionConfig[],
  },
  {
    id: 'sector-04-level-06',
    name: 'ARCHIVE CORE',
    width: 64,
    groundRow: 22,
    gaps: [],
    spikeColumns: [18, 19, 34, 35, 36, 37],
    platforms: [],
    playerStartCol: 2,
    exitCol: 58,
    traps: [
      // Trigger-armed one-shot laser (sector 03's DELAY LINE pattern).
      { type: 'trigger', id: 'trig-01', col: 26, row: 19, width: 2, height: 3, targetId: 'laser-01' },
      { type: 'laser', id: 'laser-01', col: 32, topRow: 16, bottomRow: 21, loop: false },
      // Optional elevated bypass over the second spike cluster.
      {
        type: 'moving-platform',
        id: 'bridge-01',
        fromCol: 30,
        fromRow: 20,
        toCol: 40,
        toRow: 20,
        width: 2,
        travelMs: 2600,
      },
      // Mandatory finale gate before the exit.
      { type: 'timing-gate', id: 'gate-01', col: 50, topRow: 16, bottomRow: 21 },
    ],
    sections: [
      { id: 'intro', type: 'intro', fromCol: 0, toCol: 13, requiredMechanics: ['move'] },
      { id: 'spikes-1', type: 'challenge', fromCol: 14, toCol: 21, requiredMechanics: ['spike-jump'] },
      {
        id: 'trigger-laser-bridge-spikes',
        type: 'combination',
        fromCol: 22,
        toCol: 49,
        optionalRoute: true,
        requiredMechanics: ['trigger', 'laser', 'platform', 'spike-jump'],
      },
      { id: 'gate', type: 'system', fromCol: 50, toCol: 57, requiredMechanics: ['timing-gate'] },
      { id: 'exit', type: 'final', fromCol: 58, toCol: 63 },
    ] satisfies LevelSectionConfig[],
  },
];
