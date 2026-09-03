import type { LevelDef } from '@/gameplay/LevelDef';

/**
 * SECTOR 02 — NEON GRID. Introduces the dynamic trap system (Phase 2):
 * lasers, moving platforms, trigger-linked traps, pursuers.
 *
 * Only three levels for now — enough to prove every new trap type actually
 * works end to end in a real level. The mandatory path in each level only
 * ever uses geometry already proven fair in sector 01 (jumpable gaps,
 * ground-level spikes); every new dynamic trap here is either an honest
 * wait-then-go obstacle (the laser) or a genuinely optional bonus route —
 * never a hard-timed mandatory precision check I can't verify by hand
 * (CLAUDE.md #4 — no unverified dishonest difficulty). The rest of this
 * sector's content is tracked in TODO.md as follow-up authoring.
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
        fromRow: 18,
        toCol: 30,
        toRow: 18,
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
  },
];
