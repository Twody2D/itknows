import type { LevelDef } from '@/gameplay/LevelDef';

/**
 * SECTOR 04 — DATA DISTRICT. Timing traps (master-prompt §23): the
 * timing gate (blocks, never kills — `TimingGate.ts`) and the two
 * "don't linger" platforms (disappearing/falling), teach → practice →
 * combine (§66):
 *
 * 01 SYNC GATE — two timing gates in sequence (practice: more than one
 *    doesn't change the rule — wait for green, go).
 * 02 RHYTHM — two gates with genuinely different cycle speeds (one fast,
 *    one slow custom `timing`), so there's no single rhythm to memorize —
 *    each has to be watched on its own terms.
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
    width: 54,
    groundRow: 22,
    gaps: [],
    spikeColumns: [18, 19],
    platforms: [],
    playerStartCol: 2,
    exitCol: 50,
    traps: [
      { type: 'timing-gate', id: 'gate-01', col: 30, topRow: 16, bottomRow: 21 },
      { type: 'timing-gate', id: 'gate-02', col: 42, topRow: 16, bottomRow: 21 },
    ],
  },
  {
    id: 'sector-04-level-02',
    name: 'RHYTHM',
    width: 54,
    groundRow: 22,
    gaps: [],
    spikeColumns: [18, 19],
    platforms: [],
    playerStartCol: 2,
    exitCol: 50,
    traps: [
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
  },
  {
    id: 'sector-04-level-03',
    name: 'CRUMBLE RUN',
    width: 56,
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
  },
  {
    id: 'sector-04-level-04',
    name: 'FREEFALL',
    width: 56,
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
  },
  {
    id: 'sector-04-level-05',
    name: 'LOCKSTEP',
    width: 58,
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
  },
  {
    id: 'sector-04-level-06',
    name: 'ARCHIVE CORE',
    width: 62,
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
  },
];
