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
        },
      ],
    },
  },
  [FALSE_FLOOR.id]: {
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
        },
      ],
    },
  },
  [RISE.id]: {
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
