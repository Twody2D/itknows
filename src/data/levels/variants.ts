import type { LevelDef } from '@/gameplay/LevelDef';
import { SECTOR_02_LEVELS } from './sector02';

function findBase(id: string): LevelDef {
  const found = SECTOR_02_LEVELS.find((l) => l.id === id);
  if (!found) throw new Error(`variants.ts: unknown base level id "${id}"`);
  return found;
}

const GRID_ENTRY = findBase('sector-02-level-01');
const PURSUIT = findBase('sector-02-level-03');

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
 */
export const LEVEL_VARIANTS: Record<string, { gentle?: LevelDef; bold?: LevelDef }> = {
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
};
