import type { LevelDef } from './LevelDef';
import { SECTOR_01_LEVELS } from '@/data/levels/sector01';
import { SECTOR_02_LEVELS } from '@/data/levels/sector02';

/**
 * Single registry of every handcrafted level, in play order. Centralizes
 * what `GameplayScene` used to duplicate locally.
 *
 * There is no variant selection yet — every level here has exactly one
 * (implicit) variant, and nothing produces alternates for THE SYSTEM to
 * choose between. That arrives with Phase 3 (`DifficultyDirector`) once
 * there's real behavior data to pick a variant *from* — building the
 * selection machinery first, with nothing to select, would be exactly the
 * premature abstraction CLAUDE.md rules out. `getLevel(id, variantId)`
 * already takes a `variantId` so call sites won't need to change shape when
 * variants land; it just ignores the argument for now.
 */
const ALL_LEVELS: LevelDef[] = [...SECTOR_01_LEVELS, ...SECTOR_02_LEVELS];

export function getLevel(id: string, _variantId?: string): LevelDef {
  const level = ALL_LEVELS.find((l) => l.id === id);
  if (!level) throw new Error(`Unknown level id: ${id}`);
  return level;
}

export function getNextLevelId(id: string): string | undefined {
  const index = ALL_LEVELS.findIndex((l) => l.id === id);
  return ALL_LEVELS[index + 1]?.id;
}

export function getAllLevels(): readonly LevelDef[] {
  return ALL_LEVELS;
}
