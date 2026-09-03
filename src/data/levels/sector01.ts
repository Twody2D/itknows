import type { LevelDef } from '@/gameplay/LevelDef';
import type { LevelSectionConfig } from '@/gameplay/LevelSections';

/**
 * SECTOR 01 — SYSTEM BOOT. Teaches move → jump → exit, then the first honest
 * trap, then progressively combines gaps, spikes and one-way platforms
 * (master-prompt §24: first ten minutes / §66: teach → practice → combine).
 *
 * LENGTH. These levels used to be 40-70 tiles — six or seven seconds of
 * running each, which is why the whole sector could be cleared in one sitting
 * without dying. They now run 120-250 tiles, structured as
 * intro → challenge → variation → combination → system → final with a
 * checkpoint between the major blocks. A level is no longer a single idea you
 * either fluff or nail in eight seconds; it's a stretch you have to hold
 * together. The difficulty comes from sustaining attention over a longer run,
 * not from tighter windows — every individual jump here is the same
 * comfortably-clearable jump it always was.
 *
 * CHECKPOINTS. Deliberately sparse: none at all on the two levels that can't
 * really kill you (01-02), one past the midpoint on 03-05, two on the sector
 * finale. A checkpoint every other block turned the run into a series of
 * short hops with no stretch long enough to feel like it was at stake — the
 * whole point of the added length. They exist to stop a late mistake costing
 * the entire level (CLAUDE.md #4 — length must not mean a longer punishment),
 * not to remove the cost of a mistake.
 *
 * GEOMETRY BUDGET (`jumpPhysics.ts`, unchanged): a full-held jump clears
 * ~55px horizontally (5.5 tiles) at the same height and rises ~32px (3.2
 * tiles). Every gap here is 2-3 tiles; the two 6-tile pits (level 04 and 06)
 * are explicitly bridged by a platform mid-pit, and both are proven by
 * `LevelValidator` in tests, not by eye. Platform steps stay at a 2-row
 * (20px) rise per hop.
 */
export const SECTOR_01_LEVELS: LevelDef[] = [
  {
    id: 'sector-01-level-01',
    name: 'BOOT',
    width: 120,
    groundRow: 22,
    // Nothing but gaps, widening from 2 to 3 tiles and back. The only lesson
    // is "move, jump, keep going" — no spike, no trap, no timing anywhere in
    // the level, so the tutorial hints have room to land.
    gaps: [
      [26, 27],
      [44, 46],
      [58, 59],
      [74, 76],
      [88, 89],
      [98, 100],
    ],
    spikeColumns: [],
    platforms: [],
    playerStartCol: 2,
    exitCol: 114,
    // No checkpoints: nothing in this level can kill you but a pit, and the
    // longest stretch back to one is a few seconds of running.
    sections: [
      { id: 'intro', type: 'intro', fromCol: 0, toCol: 25, requiredMechanics: ['move'] },
      { id: 'first-gap', type: 'challenge', fromCol: 26, toCol: 43, requiredMechanics: ['gap-jump'] },
      { id: 'wider-gap', type: 'challenge', fromCol: 44, toCol: 51, requiredMechanics: ['gap-jump'] },
      { id: 'rhythm', type: 'variation', fromCol: 52, toCol: 83, requiredMechanics: ['gap-jump'] },
      { id: 'closing-run', type: 'combination', fromCol: 84, toCol: 101, requiredMechanics: ['gap-jump'] },
      { id: 'exit', type: 'final', fromCol: 102, toCol: 119 },
    ] satisfies LevelSectionConfig[],
  },
  {
    id: 'sector-01-level-02',
    name: 'FIRST WARNING',
    width: 140,
    groundRow: 22,
    // Gaps only reappear in the last block — the first two thirds are the
    // spike lesson on its own, uncomplicated.
    gaps: [
      [110, 111],
      [124, 126],
    ],
    spikeColumns: [22, 23, 24, 38, 39, 54, 55, 56, 70, 71, 84, 85, 86, 100, 101],
    // Honest bypass over the third cluster: the ground route under it is
    // always available, this is just the calmer way across.
    platforms: [{ col: 83, row: 20, width: 5 }],
    playerStartCol: 2,
    exitCol: 134,
    // Still no checkpoints — spikes are jumped, not timed, and the level has
    // no stretch you can't re-run in seconds.
    sections: [
      { id: 'intro', type: 'intro', fromCol: 0, toCol: 17, requiredMechanics: ['move'] },
      { id: 'first-spikes', type: 'challenge', fromCol: 18, toCol: 27, requiredMechanics: ['spike-jump'] },
      { id: 'spike-practice', type: 'challenge', fromCol: 28, toCol: 45, requiredMechanics: ['spike-jump'] },
      {
        id: 'clusters-and-bridge',
        type: 'variation',
        fromCol: 46,
        toCol: 93,
        optionalRoute: true,
        requiredMechanics: ['spike-jump', 'platform'],
      },
      {
        id: 'spikes-and-gaps',
        type: 'combination',
        fromCol: 94,
        toCol: 127,
        requiredMechanics: ['spike-jump', 'gap-jump'],
      },
      { id: 'exit', type: 'final', fromCol: 128, toCol: 139 },
    ] satisfies LevelSectionConfig[],
  },
  {
    id: 'sector-01-level-03',
    name: 'GAP AND SPIKE',
    width: 165,
    groundRow: 22,
    gaps: [
      [16, 17],
      [34, 36],
      [62, 63],
      [78, 80],
      [104, 105],
      [120, 122],
      [140, 141],
    ],
    spikeColumns: [26, 27, 46, 47, 48, 70, 71, 92, 93, 112, 113, 132, 133, 134, 152, 153],
    // Each bridge sits directly over a spike cluster — an alternate route, not
    // a trick (CLAUDE.md #4). Jumping the spikes on the ground always works.
    platforms: [
      { col: 45, row: 20, width: 5 },
      { col: 90, row: 20, width: 5 },
      { col: 131, row: 20, width: 5 },
    ],
    playerStartCol: 2,
    exitCol: 159,
    // One, just past the midpoint.
    checkpoints: [88],
    sections: [
      { id: 'intro', type: 'intro', fromCol: 0, toCol: 15, requiredMechanics: ['move'] },
      { id: 'gaps', type: 'challenge', fromCol: 16, toCol: 41, requiredMechanics: ['gap-jump'] },
      {
        id: 'gap-and-spike',
        type: 'combination',
        fromCol: 42,
        toCol: 87,
        checkpointAfter: true,
        requiredMechanics: ['gap-jump', 'spike-jump'],
      },
      {
        id: 'bridges',
        type: 'variation',
        fromCol: 88,
        toCol: 127,
        optionalRoute: true,
        requiredMechanics: ['platform', 'spike-jump'],
      },
      {
        id: 'closing-run',
        type: 'combination',
        fromCol: 128,
        toCol: 150,
        requiredMechanics: ['gap-jump', 'spike-jump', 'platform'],
      },
      { id: 'exit', type: 'final', fromCol: 151, toCol: 164 },
    ] satisfies LevelSectionConfig[],
  },
  {
    id: 'sector-01-level-04',
    name: 'RISE',
    width: 190,
    groundRow: 22,
    gaps: [
      [18, 19],
      [40, 42],
      [64, 65],
      // The first pit too wide to clear in one jump (6 tiles / 60px against a
      // ~55px reach) — the platform mid-pit below is the crossing, and the
      // level's whole point: a platform can be the route, not a bonus.
      [84, 89],
      [110, 112],
      [134, 135],
      [156, 158],
      [176, 177],
    ],
    spikeColumns: [28, 29, 50, 51, 52, 72, 73, 96, 97, 118, 119, 144, 145, 146, 166, 167],
    platforms: [
      { col: 86, row: 20, width: 2 },
      // Up two rows, along, back down — the staircase the level is named for.
      { col: 120, row: 20, width: 3 },
      { col: 126, row: 18, width: 3 },
      { col: 132, row: 20, width: 3 },
    ],
    playerStartCol: 2,
    exitCol: 184,
    // One, right after the wide bridged pit — the level's one real gate.
    checkpoints: [94],
    sections: [
      { id: 'intro', type: 'intro', fromCol: 0, toCol: 17, requiredMechanics: ['move'] },
      { id: 'gaps', type: 'challenge', fromCol: 18, toCol: 45, requiredMechanics: ['gap-jump'] },
      {
        id: 'spikes-and-wide-pit',
        type: 'combination',
        fromCol: 46,
        toCol: 93,
        checkpointAfter: true,
        requiredMechanics: ['spike-jump', 'gap-jump', 'platform'],
      },
      { id: 'approach', type: 'challenge', fromCol: 94, toCol: 115, requiredMechanics: ['spike-jump', 'gap-jump'] },
      {
        id: 'staircase',
        type: 'variation',
        fromCol: 116,
        toCol: 139,
        requiredMechanics: ['platform', 'platform-chain'],
      },
      {
        id: 'closing-run',
        type: 'combination',
        fromCol: 140,
        toCol: 175,
        requiredMechanics: ['spike-jump', 'gap-jump'],
      },
      { id: 'exit', type: 'final', fromCol: 176, toCol: 189 },
    ] satisfies LevelSectionConfig[],
  },
  {
    id: 'sector-01-level-05',
    name: 'PRESSURE',
    width: 215,
    groundRow: 22,
    gaps: [
      [14, 15],
      [36, 38],
      [60, 61],
      [82, 84],
      [108, 109],
      [130, 132],
      [154, 155],
      [178, 180],
      [200, 201],
    ],
    spikeColumns: [
      24, 25, 26, 48, 49, 70, 71, 72, 94, 95, 118, 119, 120, 142, 143, 166, 167, 168, 190, 191,
    ],
    platforms: [
      { col: 23, row: 20, width: 5 },
      { col: 117, row: 20, width: 5 },
      { col: 165, row: 20, width: 5 },
    ],
    playerStartCol: 2,
    exitCol: 209,
    // One, after the first laser — the first thing in the campaign that can
    // kill you without you touching it.
    checkpoints: [138],
    traps: [
      // First non-static threat in the campaign: full standing height, can
      // only be waited out, not jumped or ducked — the same honest
      // patience-not-reflexes pattern sector 02 opens with. Each one stands on
      // clear ground with no gap or spike within several tiles, so the only
      // new thing being taught is "SYSTEM can put something in your way that
      // isn't a spike," never a timing check stacked on another obstacle.
      { type: 'laser', id: 'laser-01', col: 100, topRow: 16, bottomRow: 21 },
      { type: 'laser', id: 'laser-02', col: 148, topRow: 16, bottomRow: 21 },
      { type: 'laser', id: 'laser-03', col: 196, topRow: 16, bottomRow: 21 },
    ],
    sections: [
      { id: 'intro', type: 'intro', fromCol: 0, toCol: 13, requiredMechanics: ['move'] },
      {
        id: 'gaps',
        type: 'challenge',
        fromCol: 14,
        toCol: 43,
        checkpointAfter: true,
        requiredMechanics: ['gap-jump'],
      },
      {
        id: 'spike-bridge',
        type: 'variation',
        fromCol: 44,
        toCol: 89,
        optionalRoute: true,
        requiredMechanics: ['spike-jump', 'platform'],
      },
      {
        id: 'first-laser',
        type: 'system',
        fromCol: 90,
        toCol: 137,
        checkpointAfter: true,
        requiredMechanics: ['laser', 'gap-jump'],
      },
      {
        id: 'laser-and-spikes',
        type: 'combination',
        fromCol: 138,
        toCol: 185,
        requiredMechanics: ['laser', 'spike-jump', 'platform'],
      },
      {
        id: 'closing-run',
        type: 'combination',
        fromCol: 186,
        toCol: 205,
        requiredMechanics: ['laser', 'gap-jump'],
      },
      { id: 'exit', type: 'final', fromCol: 206, toCol: 214 },
    ] satisfies LevelSectionConfig[],
  },
  {
    id: 'sector-01-level-06',
    name: 'SECTOR EXIT',
    width: 250,
    groundRow: 22,
    gaps: [
      [16, 17],
      [38, 40],
      [62, 63],
      // Second wide pit — same bridged crossing RISE taught, now with the
      // rest of the sector's vocabulary around it.
      [86, 91],
      [112, 113],
      [136, 138],
      [160, 161],
      [184, 186],
      [208, 209],
      [230, 232],
    ],
    spikeColumns: [
      26, 27, 50, 51, 52, 74, 75, 100, 101, 102, 124, 125, 148, 149, 150, 172, 173, 196, 197, 198, 220, 221,
    ],
    platforms: [
      { col: 88, row: 20, width: 2 },
      { col: 99, row: 20, width: 5 },
      { col: 147, row: 20, width: 5 },
      { col: 195, row: 20, width: 5 },
    ],
    playerStartCol: 2,
    exitCol: 244,
    // Two on the sector finale — after the bridged pit, and after the long
    // laser stretch. It's the only level here where losing everything to the
    // fake exit at tile 238 would be a genuinely sour ending.
    checkpoints: [96, 192],
    traps: [
      { type: 'laser', id: 'laser-01', col: 106, topRow: 16, bottomRow: 21 },
      { type: 'laser', id: 'laser-02', col: 156, topRow: 16, bottomRow: 21 },
      { type: 'laser', id: 'laser-03', col: 178, topRow: 16, bottomRow: 21 },
      // The sector's promised "first serious SYSTEM trick": a fake exit a few
      // tiles before the real one. Never lethal by construction
      // (`FakeExit.reject()` only nudges its own sprite) and visually
      // distinguishable (no glow on the exit core) per CLAUDE.md #4.7 — the
      // trick is that it looks identical enough at a glance to make a careless
      // player briefly think they're done, not that it's unfair.
      { type: 'fake-exit', id: 'fake-exit-01', col: 238, row: 22 },
    ],
    sections: [
      { id: 'intro', type: 'intro', fromCol: 0, toCol: 15, requiredMechanics: ['move'] },
      {
        id: 'gaps',
        type: 'challenge',
        fromCol: 16,
        toCol: 45,
        requiredMechanics: ['gap-jump'],
      },
      {
        id: 'spikes-and-wide-pit',
        type: 'combination',
        fromCol: 46,
        toCol: 95,
        checkpointAfter: true,
        requiredMechanics: ['spike-jump', 'gap-jump', 'platform'],
      },
      {
        id: 'first-laser',
        type: 'system',
        fromCol: 96,
        toCol: 143,
        requiredMechanics: ['laser', 'spike-jump'],
      },
      {
        id: 'lasers-and-bridge',
        type: 'combination',
        fromCol: 144,
        toCol: 191,
        checkpointAfter: true,
        optionalRoute: true,
        requiredMechanics: ['laser', 'platform', 'gap-jump'],
      },
      {
        id: 'last-run',
        type: 'combination',
        fromCol: 192,
        toCol: 225,
        requiredMechanics: ['spike-jump', 'gap-jump', 'platform'],
      },
      {
        id: 'fake-exit',
        type: 'system',
        fromCol: 226,
        toCol: 243,
        requiredMechanics: ['fake-exit', 'gap-jump'],
      },
      { id: 'exit', type: 'final', fromCol: 244, toCol: 249 },
    ] satisfies LevelSectionConfig[],
  },
];
