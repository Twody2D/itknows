import type { LevelDef } from '@/gameplay/LevelDef';
import { SECTOR_01_LEVELS } from './sector01';
import { SECTOR_02_LEVELS } from './sector02';

function findIn(levels: LevelDef[], id: string): LevelDef {
  const found = levels.find((l) => l.id === id);
  if (!found) throw new Error(`variants.ts: unknown base level id "${id}"`);
  return found;
}

function findBase(id: string): LevelDef {
  return findIn(SECTOR_02_LEVELS, id);
}

const GRID_ENTRY = findBase('sector-02-level-01');
const PURSUIT = findBase('sector-02-level-03');
const GAP_AND_SPIKE = findIn(SECTOR_01_LEVELS, 'sector-01-level-03');

const MOVING_BRIDGE = findBase('sector-02-level-02');
const FALSE_FLOOR = findBase('sector-02-level-04');
const SHORT_CIRCUIT = findBase('sector-02-level-05');
const RISE = findIn(SECTOR_01_LEVELS, 'sector-01-level-04');
const PRESSURE = findIn(SECTOR_01_LEVELS, 'sector-01-level-05');

/**
 * `DifficultyDirector` demo content (Phase 3): two levels with real
 * gentle/bold variants, proving variant selection end to end rather than
 * leaving `variantId` a no-op parameter. Both variants of both levels are
 * covered by `LevelValidator` in tests, same as every base level.
 *
 * Only trap *tuning* changes between variants here — never geometry that
 * hasn't already been hand-verified (same rule sector02's base levels
 * follow, see that file's doc comment). `PURSUIT`'s gentle variant widens
 * the head start, which is strictly safer by construction (the pursuer is
 * already slower than the player at every speedFactor < 1 — CLAUDE.md #13 —
 * so more head start can only help); its bold variant only raises
 * speedFactor at the *already-verified* head start, never shortens it.
 *
 * Full 2-4 variants across all 30 levels is content-authoring scope, not
 * engineering scope — tracked in TODO.md, same "system complete, content
 * partial" split Phase 2 left for level count.
 *
 * `troll` is a separate axis from `gentle`/`bold` (master-prompt §15): it
 * doesn't change difficulty, it subverts a habit the player's own profile
 * shows they've formed — `DifficultyDirector.selectVariant()` only reaches
 * for it once neither struggling nor thriving already picked something.
 * `GAP_AND_SPIKE`'s troll variant is the first master-prompt §15 example
 * played straight: after two sectors' worth of gaps trained "there's always
 * a gap here, jump it", its first gap narrows from 2 tiles to 1 — walkable
 * at a run, no jump required. Never adds danger (still `LevelValidator`-
 * checked like every other variant), so it can never be an unfair surprise,
 * only a redundant one.
 */
export const LEVEL_VARIANTS: Record<string, { gentle?: LevelDef; bold?: LevelDef; troll?: LevelDef }> = {
  [GRID_ENTRY.id]: {
    // More visible warning, less time actually lethal — same corridor, same wait-then-go idea.
    gentle: {
      ...GRID_ENTRY,
      traps: [
        {
          type: 'laser',
          id: 'laser-01',
          col: 35,
          topRow: 16,
          bottomRow: 21,
          timing: { idleMs: 900, warningMs: 700, activeMs: 500, cooldownMs: 300 },
        },
      ],
    },
    // warningMs at the honest floor (MIN_WARNING_MS, never below it) — tighter attention, not unfair.
    bold: {
      ...GRID_ENTRY,
      traps: [
        {
          type: 'laser',
          id: 'laser-01',
          col: 35,
          topRow: 16,
          bottomRow: 21,
          timing: { idleMs: 900, warningMs: 250, activeMs: 900, cooldownMs: 300 },
        },
      ],
    },
  },
  [PURSUIT.id]: {
    gentle: {
      ...PURSUIT,
      playerStartCol: 9,
      traps: [{ type: 'pursuer', id: 'pursuer-01', col: 1, row: 21, speedFactor: 0.45 }],
    },
    bold: {
      ...PURSUIT,
      traps: [{ type: 'pursuer', id: 'pursuer-01', col: 1, row: 21, speedFactor: 0.75 }],
    },
  },
  [GAP_AND_SPIKE.id]: {
    // Only the first gap's width changes — every other gap, spike and the
    // bridged-platform gaps later in the level stay exactly as
    // `LevelValidator`-checked in the base level.
    troll: {
      ...GAP_AND_SPIKE,
      gaps: [[16, 16], ...GAP_AND_SPIKE.gaps.slice(1)],
    },
    // gentle/bold retune the level's own ambush spikes and sudden pits —
    // the same two knobs every ambush spike in the campaign already has
    // (`timing.warningMs`, and the trigger's distance before the landing
    // column). The trap only stays honest ("keep running unreacting = you
    // get caught, stopping during the visible fall = you survive") if the
    // travel time from trigger to landing at the player's own moveSpeed
    // (110px/s, `config/physics.ts`) is at least `warningMs` — shorter and
    // an unreacting player would clear the column *before* the spike turns
    // lethal, which would make "bold" accidentally easier, not harder.
    // Both triggers here sit in already-clear ground (checked against this
    // level's own `spikeColumns`/`gaps`) rather than at a proportionally
    // "ideal" distance that would land on the static spike cluster at
    // 46-48 or 92-93 — which is also why the two ambushes end up with
    // slightly different numbers instead of one uniform pair: each
    // respects the clear room its own spot actually has.
    // `flp-*`'s `holdMs` (the sudden pit's carry time before it drops)
    // moves the same direction, floored at `MIN_REACTION_WINDOW_MS` (300).
    gentle: {
      ...GAP_AND_SPIKE,
      traps: [
        {
          type: 'moving-spike',
          id: 'mspike-01',
          ambush: true,
          fromCol: 56,
          fromRow: 11,
          toCol: 56,
          toRow: 21,
          // Trigger 7 tiles (70px) before landing — the full clear run
          // after the 46-48 spike cluster. 636ms travel time comfortably
          // covers a 600ms warning, so the sync still holds.
          timing: { idleMs: 900, warningMs: 600, activeMs: 300, cooldownMs: 250 },
          loop: false,
        },
        {
          type: 'trigger',
          id: 'mspike-01-trigger',
          col: 49,
          row: 19,
          width: 2,
          height: 3,
          targetId: 'mspike-01',
          visible: false,
        },
        { type: 'falling-platform', id: 'flp-01', col: 82, row: 22, width: 2, holdMs: 550 },
        {
          type: 'moving-spike',
          id: 'mspike-02',
          ambush: true,
          fromCol: 100,
          fromRow: 11,
          toCol: 100,
          toRow: 21,
          // Only 6 tiles (60px) of clear ground exists after the 92-93
          // cluster, so the honest ceiling here is a smaller bump than
          // `mspike-01`'s — 545ms of travel against a 520ms warning.
          timing: { idleMs: 900, warningMs: 520, activeMs: 300, cooldownMs: 250 },
          loop: false,
        },
        {
          type: 'trigger',
          id: 'mspike-02-trigger',
          col: 94,
          row: 19,
          width: 2,
          height: 3,
          targetId: 'mspike-02',
          visible: false,
        },
        { type: 'falling-platform', id: 'flp-02', col: 146, row: 22, width: 2, holdMs: 550 },
      ],
    },
    bold: {
      ...GAP_AND_SPIKE,
      traps: [
        {
          type: 'moving-spike',
          id: 'mspike-01',
          ambush: true,
          fromCol: 56,
          fromRow: 11,
          toCol: 56,
          toRow: 21,
          // Trigger 4 tiles (40px) before landing — 364ms travel against a
          // 300ms warning (MIN_WARNING_MS, never below it): tighter
          // attention, still with the sync margin that keeps it honest.
          timing: { idleMs: 900, warningMs: 300, activeMs: 300, cooldownMs: 250 },
          loop: false,
        },
        {
          type: 'trigger',
          id: 'mspike-01-trigger',
          col: 52,
          row: 19,
          width: 2,
          height: 3,
          targetId: 'mspike-01',
          visible: false,
        },
        { type: 'falling-platform', id: 'flp-01', col: 82, row: 22, width: 2, holdMs: 300 },
        {
          type: 'moving-spike',
          id: 'mspike-02',
          ambush: true,
          fromCol: 100,
          fromRow: 11,
          toCol: 100,
          toRow: 21,
          timing: { idleMs: 900, warningMs: 300, activeMs: 300, cooldownMs: 250 },
          loop: false,
        },
        {
          type: 'trigger',
          id: 'mspike-02-trigger',
          col: 96,
          row: 19,
          width: 2,
          height: 3,
          targetId: 'mspike-02',
          visible: false,
        },
        { type: 'falling-platform', id: 'flp-02', col: 146, row: 22, width: 2, holdMs: 300 },
      ],
    },
  },

  // First real content for the five trap types added beyond master-prompt
  // §14's original 12 (`TrapDef.ts` — recorded as a deliberate scope-lock
  // revision in TODO.md, not silently folded into the old count).
  //
  // Each of the five now lives directly on these levels' BASE definition
  // (`sector01.ts`/`sector02.ts`) — present in every variant, `standard`
  // included, not just `bold`. Owner feedback after a live playtest: gating
  // brand-new content behind `DifficultyDirector`'s `thriving` streak (3
  // clean clears in a row) meant a normal playthrough could go the whole
  // campaign without ever seeing it, which read as "the traps don't
  // actually work" rather than "you haven't earned bold yet." `gentle`/
  // `bold` below only *retune* the one hazard each level already has —
  // safer/slower vs. harsher/faster — the same way every other adaptive
  // level in the campaign retunes an always-present hazard, never add or
  // remove it.
  [MOVING_BRIDGE.id]: {
    // Not trigger-gated (unlike the ambush spikes above) — `spike-bank`
    // loops on its own clock regardless of where the player is, so gentle/
    // bold only ever tune `timing`, never a trigger distance.
    gentle: {
      ...MOVING_BRIDGE,
      traps: MOVING_BRIDGE.traps!.map((trap) =>
        trap.type === 'spike-bank' && trap.id === 'sbank-01'
          ? { ...trap, timing: { idleMs: 1100, warningMs: 650, activeMs: 500, cooldownMs: 350 } }
          : trap,
      ),
    },
    bold: {
      ...MOVING_BRIDGE,
      traps: MOVING_BRIDGE.traps!.map((trap) =>
        // warningMs at the honest floor, longer activeMs and shorter idleMs
        // than gentle — less safe time overall, same telegraph.
        trap.type === 'spike-bank' && trap.id === 'sbank-01'
          ? { ...trap, timing: { idleMs: 600, warningMs: 300, activeMs: 900, cooldownMs: 250 } }
          : trap,
      ),
    },
  },
  [FALSE_FLOOR.id]: {
    gentle: {
      ...FALSE_FLOOR,
      traps: FALSE_FLOOR.traps!.map((trap) =>
        trap.type === 'spike-wall' && trap.id === 'swall-01'
          ? { ...trap, timing: { idleMs: 1100, warningMs: 650, activeMs: 500, cooldownMs: 350 } }
          : trap,
      ),
    },
    bold: {
      ...FALSE_FLOOR,
      traps: FALSE_FLOOR.traps!.map((trap) =>
        trap.type === 'spike-wall' && trap.id === 'swall-01'
          ? { ...trap, timing: { idleMs: 600, warningMs: 300, activeMs: 900, cooldownMs: 250 } }
          : trap,
      ),
    },
  },
  [RISE.id]: {
    // Slower, smaller sweep — comfortably timed around even on a first look.
    gentle: {
      ...RISE,
      traps: RISE.traps!.map((trap) =>
        trap.type === 'orbit-spike' && trap.id === 'orbit-01'
          ? { ...trap, radiusTiles: 1.5, periodMs: 2600 }
          : trap,
      ),
    },
    bold: {
      ...RISE,
      traps: RISE.traps!.map((trap) =>
        trap.type === 'orbit-spike' && trap.id === 'orbit-01'
          ? { ...trap, radiusTiles: 2, periodMs: 1800 }
          : trap,
      ),
    },
  },
  [PRESSURE.id]: {
    // Narrower swing, slower period — easier to read and time around.
    gentle: {
      ...PRESSURE,
      traps: PRESSURE.traps!.map((trap) =>
        trap.type === 'swinging-spike' && trap.id === 'swing-01'
          ? { ...trap, maxAngleDeg: 35, periodMs: 2200 }
          : trap,
      ),
    },
    bold: {
      ...PRESSURE,
      traps: PRESSURE.traps!.map((trap) =>
        trap.type === 'swinging-spike' && trap.id === 'swing-01'
          ? { ...trap, maxAngleDeg: 50, periodMs: 1600 }
          : trap,
      ),
    },
  },
  [SHORT_CIRCUIT.id]: {
    // Same circuit, slower per-leg travel — more time to read where it's headed.
    gentle: {
      ...SHORT_CIRCUIT,
      traps: SHORT_CIRCUIT.traps!.map((trap) =>
        trap.type === 'loop-spike' && trap.id === 'loop-01' ? { ...trap, travelMs: 1400 } : trap,
      ),
    },
    bold: {
      ...SHORT_CIRCUIT,
      traps: SHORT_CIRCUIT.traps!.map((trap) =>
        trap.type === 'loop-spike' && trap.id === 'loop-01' ? { ...trap, travelMs: 900 } : trap,
      ),
    },
  },
};
