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
  // `spike-bank`/`spike-wall` are phase-gated exactly like every other timed
  // hazard, so they go straight onto the mandatory path with the same
  // generous clear-ground margin every ambush spike/sudden pit in this
  // campaign already uses. `orbit-spike`/`swinging-spike`/`loop-spike` have
  // no phase cycle — their honesty is the same "slow, continuous, visible
  // motion" basis `moving-spike` relies on — and this project's own history
  // (see sector01-level-01's file doc comment) deliberately kept that class
  // of hazard on optional bonus routes only, until a specific one went
  // through the extra verification a mandatory placement needs. These three
  // follow that same precedent: a small bonus platform, always skippable by
  // the level's already-`LevelValidator`-proven ground route.
  [MOVING_BRIDGE.id]: {
    // Not trigger-gated (unlike the ambush spikes above) — `spike-bank`
    // loops on its own clock regardless of where the player is, so gentle/
    // bold only ever tune `timing`, never a trigger distance.
    gentle: {
      ...MOVING_BRIDGE,
      traps: [
        ...MOVING_BRIDGE.traps!,
        {
          type: 'spike-bank',
          id: 'sbank-01',
          col: 34,
          width: 3,
          hiddenRow: 23,
          lethalRow: 21,
          timing: { idleMs: 1100, warningMs: 650, activeMs: 500, cooldownMs: 350 },
        },
      ],
    },
    bold: {
      ...MOVING_BRIDGE,
      traps: [
        ...MOVING_BRIDGE.traps!,
        // Clear ground between `bridge-01`'s landing (30) and `laser-02`
        // (40) — the level's own quietest stretch. Hidden below the floor
        // (row 23) rising to one tile above it (row 21), the same
        // hidden/lethal row pair the campaign's ambush spikes already use.
        {
          type: 'spike-bank',
          id: 'sbank-01',
          col: 34,
          width: 3,
          hiddenRow: 23,
          lethalRow: 21,
          // warningMs at the honest floor, longer activeMs and shorter
          // idleMs than gentle — less safe time overall, same telegraph.
          timing: { idleMs: 600, warningMs: 300, activeMs: 900, cooldownMs: 250 },
        },
      ],
    },
  },
  [FALSE_FLOOR.id]: {
    gentle: {
      ...FALSE_FLOOR,
      traps: [
        ...FALSE_FLOOR.traps!,
        {
          type: 'spike-wall',
          id: 'swall-01',
          col: 68,
          topRow: 19,
          bottomRow: 21,
          extendTiles: 4,
          timing: { idleMs: 1100, warningMs: 650, activeMs: 500, cooldownMs: 350 },
        },
      ],
    },
    bold: {
      ...FALSE_FLOOR,
      traps: [
        ...FALSE_FLOOR.traps!,
        // Solid ground throughout (no gap here) — spans rows 19-21, tall
        // enough that jumping over it is not an option, only waiting for it
        // to retract. Sits in the clear run between `dp-02`'s crumble (64)
        // and `dp-03` (96), well clear of both.
        {
          type: 'spike-wall',
          id: 'swall-01',
          col: 68,
          topRow: 19,
          bottomRow: 21,
          extendTiles: 4,
          timing: { idleMs: 600, warningMs: 300, activeMs: 900, cooldownMs: 250 },
        },
      ],
    },
  },
  [RISE.id]: {
    // Slower, smaller sweep — comfortably timed around even on a first look.
    gentle: {
      ...RISE,
      platforms: [...RISE.platforms, { col: 152, row: 20, width: 2 }],
      traps: [
        ...RISE.traps!,
        {
          type: 'orbit-spike',
          id: 'orbit-01',
          pivotCol: 153,
          pivotRow: 17,
          radiusTiles: 1.5,
          periodMs: 2600,
        },
      ],
    },
    bold: {
      ...RISE,
      // A single 2-tile bonus platform in the level's plainest stretch
      // (152-154, between the gap at 150-151 and the static spikes at
      // 166-167) — stepping onto it is never required, the ground path
      // below (already `LevelValidator`-proven) is untouched.
      platforms: [...RISE.platforms, { col: 152, row: 20, width: 2 }],
      traps: [
        ...RISE.traps!,
        {
          type: 'orbit-spike',
          id: 'orbit-01',
          pivotCol: 153,
          pivotRow: 17,
          radiusTiles: 2,
          periodMs: 1800,
        },
      ],
    },
  },
  [PRESSURE.id]: {
    // Narrower swing, slower period — easier to read and time around.
    gentle: {
      ...PRESSURE,
      platforms: [...PRESSURE.platforms, { col: 106, row: 20, width: 2 }],
      traps: [
        ...PRESSURE.traps!,
        {
          type: 'swinging-spike',
          id: 'swing-01',
          pivotCol: 107,
          pivotRow: 15,
          lengthTiles: 3,
          maxAngleDeg: 35,
          periodMs: 2200,
        },
      ],
    },
    bold: {
      ...PRESSURE,
      // Bonus platform between `laser-01` (100) and `laser-02` (148) — the
      // level's longest clear stretch, ground path unaffected.
      platforms: [...PRESSURE.platforms, { col: 106, row: 20, width: 2 }],
      traps: [
        ...PRESSURE.traps!,
        {
          type: 'swinging-spike',
          id: 'swing-01',
          pivotCol: 107,
          pivotRow: 15,
          lengthTiles: 3,
          maxAngleDeg: 50,
          periodMs: 1600,
        },
      ],
    },
  },
  [SHORT_CIRCUIT.id]: {
    // Same circuit, slower per-leg travel — more time to read where it's headed.
    gentle: {
      ...SHORT_CIRCUIT,
      platforms: [
        ...SHORT_CIRCUIT.platforms,
        { col: 57, row: 19, width: 2 },
        { col: 62, row: 19, width: 2 },
      ],
      traps: [
        ...SHORT_CIRCUIT.traps!,
        {
          type: 'loop-spike',
          id: 'loop-01',
          waypoints: [
            { col: 57, row: 16 },
            { col: 64, row: 16 },
            { col: 64, row: 19 },
            { col: 57, row: 19 },
          ],
          travelMs: 1400,
        },
      ],
    },
    bold: {
      ...SHORT_CIRCUIT,
      // A small triangular bonus loop above the gap-run stretch (50-69,
      // clear of `ef-01`/`ef-02` and every static spike) — the plain gap at
      // 54-55 below remains the always-available honest route.
      platforms: [
        ...SHORT_CIRCUIT.platforms,
        { col: 57, row: 19, width: 2 },
        { col: 62, row: 19, width: 2 },
      ],
      traps: [
        ...SHORT_CIRCUIT.traps!,
        {
          type: 'loop-spike',
          id: 'loop-01',
          waypoints: [
            { col: 57, row: 16 },
            { col: 64, row: 16 },
            { col: 64, row: 19 },
            { col: 57, row: 19 },
          ],
          travelMs: 900,
        },
      ],
    },
  },
};
