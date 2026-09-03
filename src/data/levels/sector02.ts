import type { LevelDef } from '@/gameplay/LevelDef';
import type { LevelSectionConfig } from '@/gameplay/LevelSections';

/**
 * SECTOR 02 — NEON GRID. All 6 levels, exercising every one of the 12
 * dynamic trap types (`src/traps/`) at least once, in a teach → practice →
 * combine progression (master-prompt §66):
 *
 * 01 GRID ENTRY — laser (patience, not reflexes: full-height, wait it out).
 * 02 MOVING BRIDGE — moving platform (optional) + trigger-armed dormant laser.
 * 03 PURSUIT — pursuer (always slower than the player, always outrunnable).
 * 04 FALSE FLOOR — disappearing platform (mandatory bridge) + fake platform
 *    (a harmless, zero-consequence first look at the visual tell).
 * 05 SHORT CIRCUIT — electric floor (same wait-then-cross pattern as the
 *    laser) + falling platform (optional bypass).
 * 06 SECTOR EXIT — combines the moving-platform-bridge pattern from 02 with
 *    a first fake exit and a timing gate (blocks, never kills).
 *
 * The mandatory path in every level only ever uses geometry already proven
 * fair in sector 01 (jumpable gaps, ground-level spikes) or an honest
 * wait-then-go obstacle; every trap that isn't one of those two is a
 * genuinely optional bonus route — never a hard-timed mandatory precision
 * check that hasn't been verified by hand (CLAUDE.md #4 — no unverified
 * dishonest difficulty). Sectors 03-05 are tracked in TODO.md.
 *
 * Elevated bonus platforms (moving-platform bridges, the falling-platform
 * bypass) all sit at `row 20` — exactly 2 tiles above `groundRow`, matching
 * sector 01's proven "2-row rise per hop" convention (`RISE`'s staircase).
 * Not a stylistic choice: `MAX_JUMP_RISE_PX` (`jumpPhysics.ts`) caps a single
 * jump's rise at ~32px, and 4 tiles (40px, `row 18`) is physically above
 * that ceiling — no jump, however well-timed, can reach it. An earlier
 * version of this file used `row 18` for every elevated bonus route
 * (copying `row 18` from level 02's original bridge without checking it
 * against the actual jump-height limit); headless-browser testing kept
 * failing to land on the level-05 falling-platform bypass even with a
 * fully-held max-height jump, which is what surfaced the arithmetic — see
 * `docs/technical-architecture.md` for the numbers.
 */
export const SECTOR_02_LEVELS: LevelDef[] = [
  {
    id: 'sector-02-level-01',
    name: 'GRID ENTRY',
    width: 52,
    groundRow: 22,
    gaps: [[16, 18]],
    spikeColumns: [28, 29],
    platforms: [],
    playerStartCol: 2,
    exitCol: 48,
    traps: [
      // Spans the full standing height of the corridor — can't be jumped
      // over, only waited out. First laser encounter: pure patience, no
      // reflex check (master-prompt §66 — teach before testing).
      { type: 'laser', id: 'laser-01', col: 35, topRow: 16, bottomRow: 21 },
    ],
    sections: [
      { id: 'intro', type: 'intro', fromCol: 0, toCol: 15, requiredMechanics: ['move'] },
      { id: 'gap', type: 'challenge', fromCol: 16, toCol: 23, requiredMechanics: ['gap-jump'] },
      { id: 'spikes', type: 'challenge', fromCol: 24, toCol: 31, requiredMechanics: ['spike-jump'] },
      { id: 'laser', type: 'system', fromCol: 32, toCol: 39, requiredMechanics: ['laser'] },
      { id: 'exit', type: 'final', fromCol: 40, toCol: 51 },
    ] satisfies LevelSectionConfig[],
  },
  {
    id: 'sector-02-level-02',
    name: 'MOVING BRIDGE',
    width: 54,
    groundRow: 22,
    gaps: [],
    spikeColumns: [24, 25, 26, 27],
    platforms: [],
    playerStartCol: 2,
    exitCol: 50,
    traps: [
      // Optional elevated shortcut over the spike cluster — ground path
      // underneath remains a valid, honest route (same principle as the
      // sector-01 static platform bridge).
      {
        type: 'moving-platform',
        id: 'bridge-01',
        fromCol: 22,
        fromRow: 20,
        toCol: 30,
        toRow: 20,
        width: 2,
        travelMs: 2600,
      },
      // Dormant until triggered; harmless if never triggered or if the
      // player arrives after its one-shot cycle already finished — it
      // returns to idle for good afterward (loop: false), so it can never
      // become a permanent block.
      { type: 'trigger', id: 'trig-01', col: 9, row: 19, width: 2, height: 3, targetId: 'laser-02' },
      { type: 'laser', id: 'laser-02', col: 40, topRow: 16, bottomRow: 21, loop: false },
    ],
    sections: [
      { id: 'intro', type: 'intro', fromCol: 0, toCol: 8, requiredMechanics: ['move'] },
      { id: 'trigger', type: 'system', fromCol: 9, toCol: 21, requiredMechanics: ['trigger'] },
      { id: 'bridge-spikes', type: 'variation', fromCol: 22, toCol: 32, optionalRoute: true, requiredMechanics: ['spike-jump', 'platform'] },
      { id: 'laser-payoff', type: 'system', fromCol: 33, toCol: 44, requiredMechanics: ['laser'] },
      { id: 'exit', type: 'final', fromCol: 45, toCol: 53 },
    ] satisfies LevelSectionConfig[],
  },
  {
    id: 'sector-02-level-03',
    name: 'PURSUIT',
    width: 56,
    groundRow: 22,
    gaps: [[14, 15]],
    spikeColumns: [30, 31],
    platforms: [],
    // Started further ahead of the pursuer than usual (CLAUDE.md #13 — a
    // slower-than-player threat must still give an honest head start; one
    // tile of gap left almost no time to even gain control before contact).
    playerStartCol: 6,
    exitCol: 52,
    traps: [
      // Slower than the player's own top speed — always outrunnable by
      // design (CLAUDE.md #13). Pressure to keep moving, not a trap that
      // can corner an honest player.
      { type: 'pursuer', id: 'pursuer-01', col: 1, row: 21, speedFactor: 0.6 },
    ],
    sections: [
      { id: 'intro', type: 'intro', fromCol: 0, toCol: 13, requiredMechanics: ['move'] },
      { id: 'pursuit', type: 'system', fromCol: 14, toCol: 33, requiredMechanics: ['pursuer', 'gap-jump', 'spike-jump'] },
      { id: 'exit', type: 'final', fromCol: 34, toCol: 55 },
    ] satisfies LevelSectionConfig[],
  },
  {
    id: 'sector-02-level-04',
    name: 'FALSE FLOOR',
    width: 56,
    groundRow: 22,
    gaps: [[30, 31]],
    // Two ordinary ground-spike hops — already-proven sector 01 geometry
    // bracketing the two new mechanics this level actually teaches. Spaced
    // from spawn/each other the same way every sector 01 level spaces its
    // first hazard (~18-20 tiles) — not tighter just because this is a
    // later sector.
    spikeColumns: [20, 21, 46, 47],
    platforms: [],
    playerStartCol: 2,
    exitCol: 52,
    traps: [
      // The only way across the gap. Default timing (350ms crumble, plenty
      // longer than the ~180ms it takes to cross 2 tiles at top speed) —
      // "don't linger", not a reflex check, same honesty margin as every
      // other mandatory dynamic trap in this sector.
      { type: 'disappearing-platform', id: 'dp-01', col: 30, row: 22, width: 2 },
      // Purely a decoy: floats over already-safe flat ground with nothing
      // beneath it worth reaching — has no collision at all, so ignoring it
      // entirely and just walking the ground is always the honest, always-
      // available route. First fake-platform in the game: teaches the
      // visual tell (a dim, cracked tile) with zero risk before it's ever
      // used to hide a real consequence (master-prompt §14/§4 — the tell
      // must be readable before it's punished).
      { type: 'fake-platform', id: 'fp-01', col: 38, row: 20, width: 3 },
    ],
    sections: [
      { id: 'intro', type: 'intro', fromCol: 0, toCol: 13, requiredMechanics: ['move'] },
      { id: 'spikes-1', type: 'challenge', fromCol: 14, toCol: 23, requiredMechanics: ['spike-jump'] },
      { id: 'crumble-gap', type: 'combination', fromCol: 24, toCol: 33, requiredMechanics: ['gap-jump', 'disappearing-platform'] },
      { id: 'decoy', type: 'variation', fromCol: 34, toCol: 41, requiredMechanics: ['fake-platform'] },
      { id: 'spikes-2', type: 'challenge', fromCol: 42, toCol: 49, requiredMechanics: ['spike-jump'] },
      { id: 'exit', type: 'final', fromCol: 50, toCol: 55 },
    ] satisfies LevelSectionConfig[],
  },
  {
    id: 'sector-02-level-05',
    name: 'SHORT CIRCUIT',
    width: 56,
    groundRow: 22,
    gaps: [],
    spikeColumns: [20, 21, 42, 43, 44],
    platforms: [],
    playerStartCol: 2,
    exitCol: 52,
    traps: [
      // Sits directly on the main ground run (no gap underneath — the
      // level's own ground tiles are still there; this only adds a
      // periodically-lethal overlap zone on top). Same "wait for the safe
      // window, then cross" pattern already proven by GRID ENTRY's laser —
      // patience, not reflexes: idle+warning give an 1100ms+ safe window
      // per cycle against a ~360ms crossing time at top speed.
      { type: 'electric-floor', id: 'ef-01', col: 30, row: 22, width: 4 },
      // Optional elevated bypass over the second ground-spike hop (42-44)
      // — the ground path underneath (jump the spikes, already-proven
      // mechanic) is always available; using the platform instead is a
      // faster but non-mandatory route, safe as long as it isn't lingered
      // on past its 350ms shake telegraph.
      { type: 'falling-platform', id: 'flp-01', col: 41, row: 20, width: 4 },
    ],
    sections: [
      { id: 'intro', type: 'intro', fromCol: 0, toCol: 13, requiredMechanics: ['move'] },
      { id: 'spikes-1', type: 'challenge', fromCol: 14, toCol: 23, requiredMechanics: ['spike-jump'] },
      { id: 'electric-floor', type: 'system', fromCol: 24, toCol: 33, requiredMechanics: ['electric-floor'] },
      {
        id: 'bypass-spikes',
        type: 'combination',
        fromCol: 34,
        toCol: 49,
        optionalRoute: true,
        requiredMechanics: ['falling-platform', 'spike-jump'],
      },
      { id: 'exit', type: 'final', fromCol: 50, toCol: 55 },
    ] satisfies LevelSectionConfig[],
  },
  {
    id: 'sector-02-level-06',
    name: 'SECTOR EXIT',
    width: 58,
    groundRow: 22,
    gaps: [],
    spikeColumns: [20, 21, 30, 31, 32, 33],
    platforms: [],
    playerStartCol: 2,
    exitCol: 55,
    traps: [
      // Combine phase (master-prompt §66): the level02 optional-bridge
      // pattern reused verbatim over a longer spike cluster — ground path
      // underneath is still the honest, always-available route.
      {
        type: 'moving-platform',
        id: 'bridge-02',
        fromCol: 28,
        fromRow: 20,
        toCol: 38,
        toRow: 20,
        width: 2,
        travelMs: 2600,
      },
      // First fake exit in the game. Never lethal by construction
      // (`FakeExit.reject()` only ever nudges its own sprite) — satisfies
      // CLAUDE.md #4.7 trivially, not by special-casing "first appearance".
      { type: 'fake-exit', id: 'fake-exit-01', col: 44, row: 22 },
      // A "wait for the green light" gate, not a reflex check — closed
      // blocks like a wall (TimingGate.ts), never kills, so the worst case
      // is a ~1.3s wait, never a death (CLAUDE.md #13 — no gate can ever be
      // the thing that kills a player, only the honest hazards can).
      { type: 'timing-gate', id: 'gate-01', col: 50, topRow: 16, bottomRow: 21 },
    ],
    sections: [
      { id: 'intro', type: 'intro', fromCol: 0, toCol: 13, requiredMechanics: ['move'] },
      { id: 'spikes-1', type: 'challenge', fromCol: 14, toCol: 23, requiredMechanics: ['spike-jump'] },
      {
        id: 'bridge-spikes-2',
        type: 'variation',
        fromCol: 24,
        toCol: 40,
        optionalRoute: true,
        requiredMechanics: ['platform', 'spike-jump'],
      },
      { id: 'fake-exit', type: 'system', fromCol: 41, toCol: 47, requiredMechanics: ['fake-exit'] },
      { id: 'gate', type: 'combination', fromCol: 48, toCol: 54, requiredMechanics: ['timing-gate'] },
      { id: 'exit', type: 'final', fromCol: 55, toCol: 57 },
    ] satisfies LevelSectionConfig[],
  },
];
