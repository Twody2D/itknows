import type { LevelDef } from '@/gameplay/LevelDef';
import type { LevelSectionConfig } from '@/gameplay/LevelSections';

/**
 * SECTOR 02 — NEON GRID. All 6 levels, exercising every one of the 12
 * dynamic trap types (`src/traps/`) at least once, in a teach → practice →
 * combine progression (master-prompt §66):
 *
 * 01 GRID ENTRY — laser (patience, not reflexes: full-height, wait it out),
 *    then three more at wider spacing, plus an ambush spike (see
 *    sector01-level-01's doc comment) mid-way through the laser run.
 * 02 MOVING BRIDGE — moving platform (optional) + trigger-armed dormant laser,
 *    both repeated later in the level.
 * 03 PURSUIT — pursuer (always slower than the player, always outrunnable).
 * 04 FALSE FLOOR — disappearing platform (mandatory bridge) + fake platform
 *    (a harmless, zero-consequence first look at the visual tell).
 * 05 SHORT CIRCUIT — electric floor (same wait-then-cross pattern as the
 *    laser) + falling platform (optional bypass).
 * 06 SECTOR EXIT — combines the moving-platform-bridge pattern from 02 with
 *    a fake exit and two timing gates (blocks, never kills).
 *
 * LENGTH. Levels run 140-240 tiles, the same rework sector 01 got: a level is
 * a stretch to hold together, not a single idea resolved in eight seconds.
 * Checkpoints stay sparse — one past the midpoint, two on the finale, none at
 * all on PURSUIT (respawning mid-level would put the pursuer permanently out
 * of the picture and drain the level of the one thing it's about).
 *
 * The mandatory path in every level only ever uses geometry already proven
 * fair in sector 01 (jumpable gaps, ground-level spikes) or an honest
 * wait-then-go obstacle; every trap that isn't one of those two is a
 * genuinely optional bonus route — never a hard-timed mandatory precision
 * check that hasn't been verified by hand (CLAUDE.md #4 — no unverified
 * dishonest difficulty).
 *
 * Elevated bonus platforms (moving-platform bridges, the falling-platform
 * bypass) all sit at `row 20` — exactly 2 tiles above `groundRow`, matching
 * sector 01's proven "2-row rise per hop" convention (`RISE`'s staircase).
 * Not a stylistic choice: `MAX_JUMP_RISE_PX` (`jumpPhysics.ts`) caps a single
 * jump's rise at ~32px, and 4 tiles (40px, `row 18`) is physically above
 * that ceiling — no jump, however well-timed, can reach it. An earlier
 * version of this file used `row 18` for every elevated bonus route;
 * headless-browser testing kept failing to land on the level-05
 * falling-platform bypass even with a fully-held max-height jump, which is
 * what surfaced the arithmetic — see `docs/technical-architecture.md`.
 */
export const SECTOR_02_LEVELS: LevelDef[] = [
  {
    id: 'sector-02-level-01',
    name: 'GRID ENTRY',
    width: 140,
    groundRow: 22,
    gaps: [
      [16, 18],
      [48, 50],
      [74, 75],
      [100, 102],
      [124, 125],
    ],
    spikeColumns: [28, 29, 58, 59, 84, 85, 86, 110, 111, 132, 133],
    platforms: [],
    playerStartCol: 2,
    exitCol: 136,
    checkpoints: [72],
    traps: [
      // Spans the full standing height of the corridor — can't be jumped
      // over, only waited out. First laser encounter: pure patience, no
      // reflex check (master-prompt §66 — teach before testing). Each one
      // after it stands on clear ground with no gap or spike within several
      // tiles, so a laser is never stacked on another obstacle.
      { type: 'laser', id: 'laser-01', col: 35, topRow: 16, bottomRow: 21 },
      { type: 'laser', id: 'laser-02', col: 66, topRow: 16, bottomRow: 21 },
      // Ambush spike (see sector01-level-01's doc comment for the full
      // mechanism/honesty reasoning) — right after the checkpoint, in the
      // middle of the long laser-run stretch where nothing else is within
      // several tiles. Third campaign instance, first outside sector 01.
      {
        type: 'moving-spike',
        id: 'mspike-01',
        ambush: true,
        fromCol: 82,
        fromRow: 11,
        toCol: 82,
        toRow: 21,
        timing: { idleMs: 900, warningMs: 500, activeMs: 300, cooldownMs: 250 },
        loop: false,
      },
      {
        type: 'trigger',
        id: 'mspike-01-trigger',
        col: 76,
        row: 19,
        width: 2,
        height: 3,
        targetId: 'mspike-01',
        visible: false,
      },
      { type: 'laser', id: 'laser-03', col: 92, topRow: 16, bottomRow: 21 },
      { type: 'laser', id: 'laser-04', col: 118, topRow: 16, bottomRow: 21 },
    ],
    sections: [
      { id: 'intro', type: 'intro', fromCol: 0, toCol: 15, requiredMechanics: ['move'] },
      { id: 'gap', type: 'challenge', fromCol: 16, toCol: 27, requiredMechanics: ['gap-jump'] },
      { id: 'spikes', type: 'challenge', fromCol: 28, toCol: 33, requiredMechanics: ['spike-jump'] },
      { id: 'first-laser', type: 'system', fromCol: 34, toCol: 45, requiredMechanics: ['laser'] },
      {
        id: 'gaps-and-spikes',
        type: 'combination',
        fromCol: 46,
        toCol: 71,
        checkpointAfter: true,
        requiredMechanics: ['gap-jump', 'spike-jump', 'laser'],
      },
      {
        id: 'laser-run',
        type: 'system',
        fromCol: 72,
        toCol: 121,
        requiredMechanics: ['laser', 'gap-jump', 'moving-spike'],
      },
      { id: 'closing-run', type: 'combination', fromCol: 122, toCol: 133, requiredMechanics: ['spike-jump'] },
      { id: 'exit', type: 'final', fromCol: 134, toCol: 139 },
    ] satisfies LevelSectionConfig[],
  },
  {
    id: 'sector-02-level-02',
    name: 'MOVING BRIDGE',
    width: 155,
    groundRow: 22,
    gaps: [
      [46, 47],
      [86, 88],
      [120, 121],
    ],
    spikeColumns: [24, 25, 26, 27, 60, 61, 96, 97, 98, 130, 131, 132],
    platforms: [],
    playerStartCol: 2,
    exitCol: 148,
    checkpoints: [80],
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
      { type: 'laser', id: 'laser-03', col: 70, topRow: 16, bottomRow: 21 },
      // Same bridge pattern, second time, over the level's other cluster.
      {
        type: 'moving-platform',
        id: 'bridge-02',
        fromCol: 94,
        fromRow: 20,
        toCol: 104,
        toRow: 20,
        width: 2,
        travelMs: 2600,
      },
      { type: 'laser', id: 'laser-04', col: 112, topRow: 16, bottomRow: 21 },
    ],
    sections: [
      { id: 'intro', type: 'intro', fromCol: 0, toCol: 8, requiredMechanics: ['move'] },
      { id: 'trigger', type: 'system', fromCol: 9, toCol: 21, requiredMechanics: ['trigger'] },
      {
        id: 'bridge-spikes',
        type: 'variation',
        fromCol: 22,
        toCol: 32,
        optionalRoute: true,
        requiredMechanics: ['spike-jump', 'platform'],
      },
      { id: 'laser-payoff', type: 'system', fromCol: 33, toCol: 45, requiredMechanics: ['laser'] },
      { id: 'gap', type: 'challenge', fromCol: 46, toCol: 59, requiredMechanics: ['gap-jump'] },
      {
        id: 'spikes-and-laser',
        type: 'combination',
        fromCol: 60,
        toCol: 79,
        checkpointAfter: true,
        requiredMechanics: ['spike-jump', 'laser'],
      },
      {
        id: 'second-bridge',
        type: 'variation',
        fromCol: 80,
        toCol: 115,
        optionalRoute: true,
        requiredMechanics: ['platform', 'gap-jump', 'spike-jump'],
      },
      {
        id: 'closing-run',
        type: 'combination',
        fromCol: 116,
        toCol: 141,
        requiredMechanics: ['laser', 'gap-jump', 'spike-jump'],
      },
      { id: 'exit', type: 'final', fromCol: 142, toCol: 154 },
    ] satisfies LevelSectionConfig[],
  },
  {
    id: 'sector-02-level-03',
    name: 'PURSUIT',
    width: 170,
    groundRow: 22,
    gaps: [
      [14, 15],
      [44, 46],
      [78, 79],
      [110, 112],
      [140, 141],
    ],
    spikeColumns: [30, 31, 62, 63, 94, 95, 126, 127, 156, 157],
    platforms: [],
    // Started further ahead of the pursuer than usual (CLAUDE.md #13 — a
    // slower-than-player threat must still give an honest head start; one
    // tile of gap left almost no time to even gain control before contact).
    playerStartCol: 6,
    exitCol: 164,
    // No checkpoints, deliberately: respawning mid-level would leave the
    // pursuer a hundred tiles behind and the rest of the level unpressured.
    traps: [
      // Slower than the player's own top speed — always outrunnable by
      // design (CLAUDE.md #13). Pressure to keep moving, not a trap that
      // can corner an honest player.
      { type: 'pursuer', id: 'pursuer-01', col: 1, row: 21, speedFactor: 0.6 },
    ],
    sections: [
      { id: 'intro', type: 'intro', fromCol: 0, toCol: 13, requiredMechanics: ['move'] },
      {
        id: 'pursuit-1',
        type: 'system',
        fromCol: 14,
        toCol: 45,
        requiredMechanics: ['pursuer', 'gap-jump', 'spike-jump'],
      },
      {
        id: 'pursuit-2',
        type: 'system',
        fromCol: 46,
        toCol: 79,
        requiredMechanics: ['pursuer', 'gap-jump', 'spike-jump'],
      },
      {
        id: 'pursuit-3',
        type: 'combination',
        fromCol: 80,
        toCol: 111,
        requiredMechanics: ['pursuer', 'gap-jump', 'spike-jump'],
      },
      {
        id: 'pursuit-4',
        type: 'combination',
        fromCol: 112,
        toCol: 143,
        requiredMechanics: ['pursuer', 'gap-jump', 'spike-jump'],
      },
      { id: 'exit', type: 'final', fromCol: 144, toCol: 169 },
    ] satisfies LevelSectionConfig[],
  },
  {
    id: 'sector-02-level-04',
    name: 'FALSE FLOOR',
    width: 185,
    groundRow: 22,
    gaps: [
      [30, 31],
      [64, 65],
      [96, 98],
      [130, 131],
      [158, 159],
    ],
    // Ordinary ground-spike hops — already-proven sector 01 geometry
    // bracketing the two new mechanics this level actually teaches. Spaced
    // from spawn and each other the same way every sector 01 level spaces its
    // first hazard (~18-20 tiles).
    spikeColumns: [20, 21, 46, 47, 80, 81, 82, 112, 113, 144, 145, 172, 173],
    platforms: [],
    playerStartCol: 2,
    exitCol: 178,
    checkpoints: [104],
    traps: [
      // The only way across each gap it spans. Default timing (350ms crumble,
      // plenty longer than the ~180ms it takes to cross 2 tiles at top speed)
      // — "don't linger", not a reflex check, the same honesty margin as
      // every other mandatory dynamic trap in this sector.
      { type: 'disappearing-platform', id: 'dp-01', col: 30, row: 22, width: 2 },
      { type: 'disappearing-platform', id: 'dp-02', col: 64, row: 22, width: 2 },
      { type: 'disappearing-platform', id: 'dp-03', col: 96, row: 22, width: 3 },
      { type: 'disappearing-platform', id: 'dp-04', col: 130, row: 22, width: 2 },
      // Purely decoys: they float over already-safe flat ground with nothing
      // beneath them worth reaching, and have no collision at all, so
      // ignoring them and walking the ground is always the honest,
      // always-available route. Teaches the visual tell (a dim, cracked tile)
      // with zero risk before it's ever used to hide a real consequence
      // (master-prompt §14/§4 — the tell must be readable before it's
      // punished).
      { type: 'fake-platform', id: 'fp-01', col: 38, row: 20, width: 3 },
      { type: 'fake-platform', id: 'fp-02', col: 120, row: 20, width: 3 },
    ],
    sections: [
      { id: 'intro', type: 'intro', fromCol: 0, toCol: 13, requiredMechanics: ['move'] },
      { id: 'spikes-1', type: 'challenge', fromCol: 14, toCol: 23, requiredMechanics: ['spike-jump'] },
      {
        id: 'crumble-gap',
        type: 'combination',
        fromCol: 24,
        toCol: 33,
        requiredMechanics: ['gap-jump', 'disappearing-platform'],
      },
      { id: 'decoy', type: 'variation', fromCol: 34, toCol: 45, requiredMechanics: ['fake-platform'] },
      { id: 'spikes-2', type: 'challenge', fromCol: 46, toCol: 59, requiredMechanics: ['spike-jump'] },
      {
        id: 'crumble-2',
        type: 'combination',
        fromCol: 60,
        toCol: 71,
        requiredMechanics: ['gap-jump', 'disappearing-platform'],
      },
      {
        id: 'spikes-and-crumble',
        type: 'combination',
        fromCol: 72,
        toCol: 103,
        checkpointAfter: true,
        requiredMechanics: ['spike-jump', 'gap-jump', 'disappearing-platform'],
      },
      { id: 'spikes-3', type: 'challenge', fromCol: 104, toCol: 127, requiredMechanics: ['spike-jump'] },
      {
        id: 'decoy-2',
        type: 'variation',
        fromCol: 128,
        toCol: 155,
        requiredMechanics: ['fake-platform', 'disappearing-platform'],
      },
      { id: 'closing-run', type: 'combination', fromCol: 156, toCol: 175, requiredMechanics: ['gap-jump'] },
      { id: 'exit', type: 'final', fromCol: 176, toCol: 184 },
    ] satisfies LevelSectionConfig[],
  },
  {
    id: 'sector-02-level-05',
    name: 'SHORT CIRCUIT',
    width: 205,
    groundRow: 22,
    gaps: [
      [54, 55],
      [88, 90],
      [124, 125],
      [160, 162],
    ],
    spikeColumns: [20, 21, 42, 43, 44, 70, 71, 104, 105, 106, 140, 141, 176, 177, 178],
    platforms: [],
    playerStartCol: 2,
    exitCol: 198,
    checkpoints: [116],
    traps: [
      // Sits directly on the main ground run (no gap underneath — the level's
      // own ground tiles are still there; this only adds a periodically-lethal
      // overlap zone on top). Same "wait for the safe window, then cross"
      // pattern already proven by GRID ENTRY's laser — patience, not reflexes:
      // idle+warning give an 1100ms+ safe window per cycle against a ~360ms
      // crossing time at top speed.
      { type: 'electric-floor', id: 'ef-01', col: 30, row: 22, width: 4 },
      { type: 'electric-floor', id: 'ef-02', col: 96, row: 22, width: 4 },
      { type: 'electric-floor', id: 'ef-03', col: 148, row: 22, width: 4 },
      // Optional elevated bypasses over the ground-spike hops — the ground
      // path underneath (jump the spikes, already-proven mechanic) is always
      // available; the platform is a faster but non-mandatory route, safe as
      // long as it isn't lingered on past its 350ms shake telegraph.
      { type: 'falling-platform', id: 'flp-01', col: 41, row: 20, width: 4 },
      { type: 'falling-platform', id: 'flp-02', col: 103, row: 20, width: 5 },
      { type: 'falling-platform', id: 'flp-03', col: 175, row: 20, width: 5 },
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
      { id: 'gap-run', type: 'challenge', fromCol: 50, toCol: 69, requiredMechanics: ['gap-jump'] },
      {
        id: 'electric-2',
        type: 'system',
        fromCol: 70,
        toCol: 115,
        checkpointAfter: true,
        requiredMechanics: ['electric-floor', 'spike-jump', 'gap-jump'],
      },
      {
        id: 'bypass-2',
        type: 'variation',
        fromCol: 116,
        toCol: 145,
        optionalRoute: true,
        requiredMechanics: ['falling-platform', 'gap-jump', 'spike-jump'],
      },
      { id: 'electric-3', type: 'system', fromCol: 146, toCol: 171, requiredMechanics: ['electric-floor', 'gap-jump'] },
      {
        id: 'bypass-3',
        type: 'combination',
        fromCol: 172,
        toCol: 193,
        optionalRoute: true,
        requiredMechanics: ['falling-platform', 'spike-jump'],
      },
      { id: 'exit', type: 'final', fromCol: 194, toCol: 204 },
    ] satisfies LevelSectionConfig[],
  },
  {
    id: 'sector-02-level-06',
    name: 'SECTOR EXIT',
    width: 240,
    groundRow: 22,
    gaps: [
      [46, 47],
      [84, 86],
      [118, 119],
      [150, 152],
      [186, 187],
      [214, 215],
    ],
    spikeColumns: [
      20, 21, 30, 31, 32, 33, 62, 63, 96, 97, 98, 130, 131, 164, 165, 166, 198, 199, 224, 225,
    ],
    platforms: [],
    playerStartCol: 2,
    exitCol: 234,
    checkpoints: [90, 178],
    traps: [
      // Combine phase (master-prompt §66): the level02 optional-bridge
      // pattern reused verbatim over longer spike clusters — the ground path
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
      { type: 'laser', id: 'laser-01', col: 56, topRow: 16, bottomRow: 21 },
      {
        type: 'moving-platform',
        id: 'bridge-03',
        fromCol: 94,
        fromRow: 20,
        toCol: 104,
        toRow: 20,
        width: 2,
        travelMs: 2600,
      },
      { type: 'electric-floor', id: 'ef-01', col: 110, row: 22, width: 4 },
      // "Wait for the green light" gates, not reflex checks — closed blocks
      // like a wall (TimingGate.ts), never kills, so the worst case is a
      // ~1.3s wait, never a death (CLAUDE.md #13 — no gate can ever be the
      // thing that kills a player, only the honest hazards can).
      { type: 'timing-gate', id: 'gate-01', col: 140, topRow: 16, bottomRow: 21 },
      {
        type: 'moving-platform',
        id: 'bridge-04',
        fromCol: 162,
        fromRow: 20,
        toCol: 172,
        toRow: 20,
        width: 2,
        travelMs: 2600,
      },
      // Fake exit. Never lethal by construction (`FakeExit.reject()` only
      // ever nudges its own sprite) — satisfies CLAUDE.md #4.7 trivially, not
      // by special-casing "first appearance".
      { type: 'fake-exit', id: 'fake-exit-01', col: 206, row: 22 },
      { type: 'timing-gate', id: 'gate-02', col: 230, topRow: 16, bottomRow: 21 },
    ],
    sections: [
      { id: 'intro', type: 'intro', fromCol: 0, toCol: 13, requiredMechanics: ['move'] },
      { id: 'spikes-1', type: 'challenge', fromCol: 14, toCol: 23, requiredMechanics: ['spike-jump'] },
      {
        id: 'bridge-spikes-2',
        type: 'variation',
        fromCol: 24,
        toCol: 45,
        optionalRoute: true,
        requiredMechanics: ['platform', 'spike-jump'],
      },
      { id: 'gap-and-laser', type: 'combination', fromCol: 46, toCol: 69, requiredMechanics: ['gap-jump', 'laser'] },
      {
        id: 'spikes-3',
        type: 'challenge',
        fromCol: 70,
        toCol: 89,
        checkpointAfter: true,
        requiredMechanics: ['spike-jump', 'gap-jump'],
      },
      {
        id: 'bridge-and-electric',
        type: 'combination',
        fromCol: 90,
        toCol: 125,
        optionalRoute: true,
        requiredMechanics: ['platform', 'electric-floor', 'gap-jump'],
      },
      { id: 'gate', type: 'system', fromCol: 126, toCol: 149, requiredMechanics: ['timing-gate', 'spike-jump'] },
      {
        id: 'gap-and-bridge',
        type: 'combination',
        fromCol: 150,
        toCol: 177,
        optionalRoute: true,
        checkpointAfter: true,
        requiredMechanics: ['gap-jump', 'platform', 'spike-jump'],
      },
      { id: 'spikes-4', type: 'challenge', fromCol: 178, toCol: 203, requiredMechanics: ['spike-jump', 'gap-jump'] },
      { id: 'fake-exit', type: 'system', fromCol: 204, toCol: 229, requiredMechanics: ['fake-exit', 'gap-jump'] },
      { id: 'final-gate', type: 'system', fromCol: 230, toCol: 233, requiredMechanics: ['timing-gate'] },
      { id: 'exit', type: 'final', fromCol: 234, toCol: 239 },
    ] satisfies LevelSectionConfig[],
  },
];
