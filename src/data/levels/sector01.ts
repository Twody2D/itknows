import type { LevelDef } from '@/gameplay/LevelDef';
import type { LevelSectionConfig } from '@/gameplay/LevelSections';

/**
 * SECTOR 01 — SYSTEM BOOT. Teaches move → jump → exit, then the first honest
 * trap, then progressively combines gaps, spikes and one-way platforms
 * (master-prompt §24: first ten minutes / §66: teach → practice → combine).
 *
 * Platform steps are kept to a 2-row (20px) rise per hop — comfortably under
 * the ~32px jump apex from PHYSICS (config/physics.ts), so every jump in
 * this sector clears with margin rather than relying on frame-perfect input.
 */
export const SECTOR_01_LEVELS: LevelDef[] = [
  {
    id: 'sector-01-level-01',
    name: 'BOOT',
    width: 40,
    groundRow: 22,
    gaps: [[18, 20]],
    spikeColumns: [],
    platforms: [],
    playerStartCol: 2,
    exitCol: 36,
    sections: [
      { id: 'intro', type: 'intro', fromCol: 0, toCol: 17, requiredMechanics: ['move'] },
      { id: 'first-gap', type: 'challenge', fromCol: 18, toCol: 25, requiredMechanics: ['gap-jump'] },
      { id: 'exit', type: 'final', fromCol: 26, toCol: 39 },
    ] satisfies LevelSectionConfig[],
  },
  {
    id: 'sector-01-level-02',
    name: 'FIRST WARNING',
    width: 44,
    groundRow: 22,
    gaps: [],
    spikeColumns: [22, 23, 24],
    platforms: [],
    playerStartCol: 2,
    exitCol: 40,
    sections: [
      { id: 'intro', type: 'intro', fromCol: 0, toCol: 17, requiredMechanics: ['move'] },
      { id: 'spikes', type: 'challenge', fromCol: 18, toCol: 29, requiredMechanics: ['spike-jump'] },
      { id: 'exit', type: 'final', fromCol: 30, toCol: 43 },
    ] satisfies LevelSectionConfig[],
  },
  {
    id: 'sector-01-level-03',
    name: 'GAP AND SPIKE',
    width: 50,
    groundRow: 22,
    gaps: [[14, 16]],
    spikeColumns: [30, 31],
    platforms: [{ col: 24, row: 20, width: 4 }],
    playerStartCol: 2,
    exitCol: 46,
    sections: [
      { id: 'intro', type: 'intro', fromCol: 0, toCol: 13, requiredMechanics: ['move'] },
      { id: 'gap', type: 'challenge', fromCol: 14, toCol: 23, requiredMechanics: ['gap-jump'] },
      { id: 'bridge', type: 'variation', fromCol: 24, toCol: 29, optionalRoute: true, requiredMechanics: ['platform'] },
      { id: 'spikes', type: 'challenge', fromCol: 30, toCol: 33, requiredMechanics: ['spike-jump'] },
      { id: 'exit', type: 'final', fromCol: 34, toCol: 49 },
    ] satisfies LevelSectionConfig[],
  },
  {
    id: 'sector-01-level-04',
    name: 'RISE',
    width: 56,
    groundRow: 22,
    gaps: [[16, 17]],
    spikeColumns: [26, 27],
    platforms: [
      { col: 34, row: 20, width: 3 },
      { col: 40, row: 18, width: 3 },
    ],
    playerStartCol: 2,
    exitCol: 52,
    sections: [
      { id: 'intro', type: 'intro', fromCol: 0, toCol: 15, requiredMechanics: ['move'] },
      { id: 'gap', type: 'challenge', fromCol: 16, toCol: 25, requiredMechanics: ['gap-jump'] },
      { id: 'spikes', type: 'challenge', fromCol: 26, toCol: 29, requiredMechanics: ['spike-jump'] },
      { id: 'staircase', type: 'variation', fromCol: 30, toCol: 43, requiredMechanics: ['platform', 'platform-chain'] },
      { id: 'exit', type: 'final', fromCol: 44, toCol: 55 },
    ] satisfies LevelSectionConfig[],
  },
  {
    id: 'sector-01-level-05',
    name: 'PRESSURE',
    width: 64,
    groundRow: 22,
    gaps: [
      [12, 13],
      [38, 40],
    ],
    spikeColumns: [20, 21, 22, 48],
    // The platform bridges straight over the spike cluster: an honest
    // alternate route, not a trick (CLAUDE.md #4 — no dishonest difficulty).
    platforms: [{ col: 19, row: 20, width: 5 }],
    playerStartCol: 2,
    exitCol: 60,
    traps: [
      // First non-static threat in the campaign: full standing height, can
      // only be waited out, not jumped or ducked — same honest
      // patience-not-reflexes pattern sector 02 opens with. Placed on clear
      // ground with no gap or spike nearby so the only new thing being
      // taught here is "SYSTEM can put something in your way that isn't a
      // spike," not a timing check stacked on another obstacle.
      { type: 'laser', id: 'laser-01', col: 32, topRow: 16, bottomRow: 21 },
    ],
    sections: [
      { id: 'intro', type: 'intro', fromCol: 0, toCol: 11, requiredMechanics: ['move'] },
      { id: 'gap', type: 'challenge', fromCol: 12, toCol: 18, requiredMechanics: ['gap-jump'] },
      {
        id: 'spike-bridge',
        type: 'variation',
        fromCol: 19,
        toCol: 23,
        optionalRoute: true,
        requiredMechanics: ['spike-jump', 'platform'],
      },
      { id: 'laser', type: 'system', fromCol: 24, toCol: 35, requiredMechanics: ['laser'] },
      { id: 'gap-and-spike', type: 'combination', fromCol: 36, toCol: 51, requiredMechanics: ['gap-jump', 'spike-jump'] },
      { id: 'exit', type: 'final', fromCol: 52, toCol: 63 },
    ] satisfies LevelSectionConfig[],
  },
  {
    id: 'sector-01-level-06',
    name: 'SECTOR EXIT',
    width: 70,
    groundRow: 22,
    gaps: [
      [14, 15],
      [44, 46],
    ],
    spikeColumns: [24, 25, 56],
    platforms: [
      { col: 30, row: 20, width: 3 },
      { col: 34, row: 18, width: 3 },
    ],
    playerStartCol: 2,
    exitCol: 66,
    // One checkpoint after the opening gap+spike stretch, one after the
    // second gap — dying to the fake exit or the closing spike no longer
    // means replaying the whole level (CheckpointSystem pilot; see
    // gameplay/sectors.ts / Level.ts's `checkpoints` handling).
    checkpoints: [28, 48],
    traps: [
      // The sector's promised "first serious SYSTEM trick": a fake exit a
      // few tiles before the real one. Never lethal by construction
      // (`FakeExit.reject()` only nudges its own sprite) and visually
      // distinguishable (no glow on the exit core) per CLAUDE.md #4.7 — the
      // trick is that it looks identical enough at a glance to make a
      // careless player briefly think they're done, not that it's unfair.
      { type: 'fake-exit', id: 'fake-exit-01', col: 60, row: 22 },
    ],
    sections: [
      { id: 'intro', type: 'intro', fromCol: 0, toCol: 13, requiredMechanics: ['move'] },
      { id: 'gap', type: 'challenge', fromCol: 14, toCol: 19, requiredMechanics: ['gap-jump'] },
      {
        id: 'spikes',
        type: 'combination',
        fromCol: 20,
        toCol: 28,
        checkpointAfter: true,
        requiredMechanics: ['spike-jump'],
      },
      {
        id: 'staircase-and-laser',
        type: 'variation',
        fromCol: 29,
        toCol: 43,
        optionalRoute: true,
        requiredMechanics: ['platform', 'laser'],
      },
      {
        id: 'second-gap',
        type: 'combination',
        fromCol: 44,
        toCol: 48,
        checkpointAfter: true,
        requiredMechanics: ['gap-jump'],
      },
      {
        id: 'fake-exit-and-spike',
        type: 'system',
        fromCol: 49,
        toCol: 61,
        requiredMechanics: ['fake-exit', 'spike-jump'],
      },
      { id: 'exit', type: 'final', fromCol: 62, toCol: 69 },
    ] satisfies LevelSectionConfig[],
  },
];
