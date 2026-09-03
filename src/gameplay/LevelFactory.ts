import type { LevelDef } from './LevelDef';
import { SECTOR_01_LEVELS } from '@/data/levels/sector01';
import { SECTOR_02_LEVELS } from '@/data/levels/sector02';
import { SECTOR_03_LEVELS } from '@/data/levels/sector03';
import { SECTOR_04_LEVELS } from '@/data/levels/sector04';
import { SECTOR_05_LEVELS } from '@/data/levels/sector05';
import { LEVEL_VARIANTS } from '@/data/levels/variants';

/**
 * Single registry of every handcrafted level, in play order. Centralizes
 * what `GameplayScene` used to duplicate locally.
 *
 * `ALL_LEVELS` holds each level's base ("standard") shape — what
 * `LevelValidator`/tests check by default, and what a `variantId` that
 * isn't in `LEVEL_VARIANTS` falls back to. `DifficultyDirector` (Phase 3)
 * is the only caller that ever passes a real `variantId`.
 */
const ALL_LEVELS: LevelDef[] = [
  ...SECTOR_01_LEVELS,
  ...SECTOR_02_LEVELS,
  ...SECTOR_03_LEVELS,
  ...SECTOR_04_LEVELS,
  ...SECTOR_05_LEVELS,
];

export function getLevel(id: string, variantId?: string): LevelDef {
  const level = ALL_LEVELS.find((l) => l.id === id);
  if (!level) throw new Error(`Unknown level id: ${id}`);
  if (!variantId || variantId === 'standard') return level;
  const variant = LEVEL_VARIANTS[id]?.[variantId as 'gentle' | 'bold'];
  return variant ?? level;
}

export function getNextLevelId(id: string): string | undefined {
  const index = ALL_LEVELS.findIndex((l) => l.id === id);
  return ALL_LEVELS[index + 1]?.id;
}

export function getAllLevels(): readonly LevelDef[] {
  return ALL_LEVELS;
}
