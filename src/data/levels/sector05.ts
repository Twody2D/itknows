import type { LevelDef } from '@/gameplay/LevelDef';
import type { LevelSectionConfig } from '@/gameplay/LevelSections';

/**
 * SECTOR 05 — SYSTEM CORE. Campaign finale (master-prompt §23): "комбинирование
 * механик" — no new mandatory mechanic of its own, this sector composes the
 * mechanics sectors 02-04 already taught individually. Teach → practice →
 * combine (§66) is applied one level up: level 01-02 teach the one genuinely
 * new-in-content trap type (`moving-spike` — defined since Phase 2 but never
 * placed in a level until now), then every level after that composes it and
 * everything else with what's already proven.
 *
 * `moving-spike` (`MovingSpikeTrap.ts`) has no warning phase by design — its
 * own continuous, always-visible motion IS the telegraph, not a timed cue.
 * That's honest for an *optional* hazard a cautious player can simply never
 * approach, but this project doesn't ship an unverified mandatory
 * dynamic-timed crossing on a guess (CLAUDE.md #4). So every `moving-spike`
 * placement in this sector guards an optional elevated bonus platform only —
 * the ground path underneath (already-proven spike-jumping) is always the
 * complete, hazard-free mandatory route. Same discipline as `fake-platform`
 * elsewhere: real risk, purely opt-in.
 *
 * 01 PATROL — one moving-spike patrolling part of a bonus platform's span,
 *    leaving the far end always clear as a guaranteed retreat.
 * 02 CROSSFIRE — two moving-spikes over a longer platform, deliberately
 *    different travelMs so they drift out of phase (same idea as sector 03's
 *    OFFSET, applied to the new mechanic).
 * 03 OVERDRIVE — pursuer (sector 02) forces continuous forward motion on the
 *    mandatory ground path while a moving-spike-guarded platform offers an
 *    optional shortcut. Reuses PURSUIT's exact spawn/speed numbers rather
 *    than re-deriving pursuer fairness from scratch.
 * 04 GRIDLOCK — electric-floor (mandatory honest wait, sector 03) then a
 *    moving-platform bypass (optional, sector 02/03/04) over a spike
 *    cluster — two already-proven mechanics layered, not fused.
 * 05 LAST GATE — trigger-armed one-shot laser (sector 03) followed by a
 *    timing gate (sector 04): two different "wait for it" mechanics
 *    composed back to back, plus an optional moving-spike-guarded platform.
 * 06 SYSTEM CORE — campaign finale: moving-platform bypass + looping laser +
 *    a fake exit (decoy, never lethal — CLAUDE.md #4.7) + a timing gate
 *    before the real exit. The biggest single composition in the game.
 *
 * Same conventions as every sector before this one: `groundRow: 22`, first
 * hazard ~18-20 tiles from `playerStartCol`, every elevated platform at
 * `row 20` (never `row 18` — see sector 02's doc comment / CLAUDE.md #4),
 * mandatory path never requires a jump timed against a dynamic trap that
 * hasn't already shipped proven elsewhere in the campaign. No pursuer
 * combined with a "wait it out" mechanic (laser/timing-gate/electric-floor)
 * in the same level, for the same reason sectors 03-04 avoid it.
 */
export const SECTOR_05_LEVELS: LevelDef[] = [
  {
    id: 'sector-05-level-01',
    name: 'PATROL',
    // Widened from 56 — see sector03.ts's level-01 doc comment for why.
    width: 64,
    groundRow: 22,
    gaps: [],
    spikeColumns: [18, 19],
    platforms: [{ col: 26, row: 20, width: 8 }],
    playerStartCol: 2,
    exitCol: 50,
    traps: [
      // Patrols only the near two-thirds of the platform — the far end
      // (col 33) is always clear, a guaranteed safe landing for a first
      // look at the mechanic.
      { type: 'moving-spike', id: 'mspike-01', fromCol: 26, fromRow: 19, toCol: 32, toRow: 19, travelMs: 2600 },
    ],
    sections: [
      { id: 'intro', type: 'intro', fromCol: 0, toCol: 13, requiredMechanics: ['move'] },
      { id: 'spikes', type: 'challenge', fromCol: 14, toCol: 21, requiredMechanics: ['spike-jump'] },
      {
        id: 'patrol-platform',
        type: 'variation',
        fromCol: 22,
        toCol: 41,
        optionalRoute: true,
        requiredMechanics: ['platform', 'moving-spike'],
      },
      { id: 'exit', type: 'final', fromCol: 42, toCol: 63 },
    ] satisfies LevelSectionConfig[],
  },
  {
    id: 'sector-05-level-02',
    name: 'CROSSFIRE',
    width: 64,
    groundRow: 22,
    gaps: [],
    spikeColumns: [18, 19],
    platforms: [{ col: 26, row: 20, width: 14 }],
    playerStartCol: 2,
    exitCol: 52,
    traps: [
      // Two non-overlapping patrol ranges on one longer platform, different
      // travelMs so they drift out of phase — nothing to memorize, has to
      // be watched (same idea as sector 03's OFFSET).
      { type: 'moving-spike', id: 'mspike-01', fromCol: 26, fromRow: 19, toCol: 32, toRow: 19, travelMs: 2600 },
      { type: 'moving-spike', id: 'mspike-02', fromCol: 34, fromRow: 19, toCol: 40, toRow: 19, travelMs: 1900 },
    ],
    sections: [
      { id: 'intro', type: 'intro', fromCol: 0, toCol: 13, requiredMechanics: ['move'] },
      { id: 'spikes', type: 'challenge', fromCol: 14, toCol: 21, requiredMechanics: ['spike-jump'] },
      {
        id: 'crossfire-platform',
        type: 'variation',
        fromCol: 22,
        toCol: 43,
        optionalRoute: true,
        requiredMechanics: ['platform', 'moving-spike'],
      },
      { id: 'exit', type: 'final', fromCol: 44, toCol: 63 },
    ] satisfies LevelSectionConfig[],
  },
  {
    id: 'sector-05-level-03',
    name: 'OVERDRIVE',
    width: 64,
    groundRow: 22,
    gaps: [],
    spikeColumns: [20, 21, 30, 31],
    platforms: [{ col: 40, row: 20, width: 8 }],
    // Same spawn column and speedFactor as sector 02's PURSUIT — reusing
    // the exact, already-verified numbers rather than re-deriving pursuer
    // fairness for a new level.
    playerStartCol: 6,
    exitCol: 54,
    traps: [
      { type: 'pursuer', id: 'pursuer-01', col: 1, row: 21, speedFactor: 0.6 },
      { type: 'moving-spike', id: 'mspike-01', fromCol: 40, fromRow: 19, toCol: 46, toRow: 19, travelMs: 2600 },
    ],
    sections: [
      { id: 'intro', type: 'intro', fromCol: 0, toCol: 13, requiredMechanics: ['move'] },
      { id: 'pursuit-spikes', type: 'system', fromCol: 14, toCol: 33, requiredMechanics: ['pursuer', 'spike-jump'] },
      {
        id: 'platform-mspike',
        type: 'variation',
        fromCol: 34,
        toCol: 51,
        optionalRoute: true,
        requiredMechanics: ['platform', 'moving-spike'],
      },
      { id: 'exit', type: 'final', fromCol: 52, toCol: 63 },
    ] satisfies LevelSectionConfig[],
  },
  {
    id: 'sector-05-level-04',
    name: 'GRIDLOCK',
    width: 64,
    groundRow: 22,
    gaps: [],
    spikeColumns: [18, 19, 32, 33, 34, 35],
    platforms: [],
    playerStartCol: 2,
    exitCol: 54,
    traps: [
      { type: 'electric-floor', id: 'ef-01', col: 24, row: 22, width: 4 },
      // Optional bypass over the second spike cluster — ground path
      // underneath (jump the spikes) is always available, same as every
      // moving-platform bridge so far.
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
    ],
    sections: [
      { id: 'intro', type: 'intro', fromCol: 0, toCol: 13, requiredMechanics: ['move'] },
      { id: 'spikes-1', type: 'challenge', fromCol: 14, toCol: 21, requiredMechanics: ['spike-jump'] },
      { id: 'electric-floor', type: 'system', fromCol: 22, toCol: 29, requiredMechanics: ['electric-floor'] },
      {
        id: 'bridge-spikes-2',
        type: 'variation',
        fromCol: 30,
        toCol: 49,
        optionalRoute: true,
        requiredMechanics: ['platform', 'spike-jump'],
      },
      { id: 'exit', type: 'final', fromCol: 50, toCol: 63 },
    ] satisfies LevelSectionConfig[],
  },
  {
    id: 'sector-05-level-05',
    name: 'LAST GATE',
    width: 64,
    groundRow: 22,
    gaps: [],
    spikeColumns: [18, 19],
    platforms: [{ col: 44, row: 20, width: 8 }],
    playerStartCol: 2,
    exitCol: 56,
    traps: [
      // First "wait for it": a one-shot trigger-armed laser (sector 03's
      // DELAY LINE pattern).
      { type: 'trigger', id: 'trig-01', col: 24, row: 19, width: 2, height: 3, targetId: 'laser-01' },
      { type: 'laser', id: 'laser-01', col: 30, topRow: 16, bottomRow: 21, loop: false },
      // Second, independent "wait for it": a timing gate further along —
      // composed back to back, each still resolving fully on its own
      // (PRESSURE VALVE's "layered, not fused" principle).
      { type: 'timing-gate', id: 'gate-01', col: 38, topRow: 16, bottomRow: 21 },
      { type: 'moving-spike', id: 'mspike-01', fromCol: 44, fromRow: 19, toCol: 50, toRow: 19, travelMs: 2600 },
    ],
    sections: [
      { id: 'intro', type: 'intro', fromCol: 0, toCol: 13, requiredMechanics: ['move'] },
      { id: 'spikes', type: 'challenge', fromCol: 14, toCol: 21, requiredMechanics: ['spike-jump'] },
      { id: 'trigger-laser', type: 'system', fromCol: 22, toCol: 33, requiredMechanics: ['trigger', 'laser'] },
      { id: 'gate', type: 'system', fromCol: 34, toCol: 41, requiredMechanics: ['timing-gate'] },
      {
        id: 'platform-mspike',
        type: 'variation',
        fromCol: 42,
        toCol: 53,
        optionalRoute: true,
        requiredMechanics: ['platform', 'moving-spike'],
      },
      { id: 'exit', type: 'final', fromCol: 54, toCol: 63 },
    ] satisfies LevelSectionConfig[],
  },
  {
    id: 'sector-05-level-06',
    name: 'SYSTEM CORE',
    width: 64,
    groundRow: 22,
    gaps: [],
    spikeColumns: [18, 19, 34, 35, 36, 37],
    platforms: [],
    playerStartCol: 2,
    exitCol: 60,
    traps: [
      // Optional bypass over the second spike cluster.
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
      // Mandatory looping laser.
      { type: 'laser', id: 'laser-01', col: 44, topRow: 16, bottomRow: 21 },
      // Decoy — never lethal by construction (`FakeExit.reject()`), always
      // distinguishable (unlit `exit-inactive` texture, never glows).
      { type: 'fake-exit', id: 'fake-exit-01', col: 50, row: 22 },
      // Final gate before the real exit.
      { type: 'timing-gate', id: 'gate-01', col: 56, topRow: 16, bottomRow: 21 },
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
      { id: 'laser', type: 'system', fromCol: 42, toCol: 47, requiredMechanics: ['laser'] },
      { id: 'fake-exit', type: 'system', fromCol: 48, toCol: 53, requiredMechanics: ['fake-exit'] },
      { id: 'gate', type: 'combination', fromCol: 54, toCol: 61, requiredMechanics: ['timing-gate'] },
      { id: 'exit', type: 'final', fromCol: 62, toCol: 63 },
    ] satisfies LevelSectionConfig[],
  },
];
