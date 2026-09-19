import type { LevelDef } from './LevelDef';
import { SECTOR_01_LEVELS } from '@/data/levels/sector01';
import { SECTOR_02_LEVELS } from '@/data/levels/sector02';
import { SECTOR_03_LEVELS } from '@/data/levels/sector03';
import { SECTOR_04_LEVELS } from '@/data/levels/sector04';
import { SECTOR_05_LEVELS } from '@/data/levels/sector05';
import { SECTOR_06_LEVELS } from '@/data/levels/sector06';
import { SECTOR_07_LEVELS } from '@/data/levels/sector07';
import { SECTOR_08_LEVELS } from '@/data/levels/sector08';

/**
 * Single registry of every handcrafted level, in play order.
 *
 * ONE SHAPE PER LEVEL, and that is now the whole story. There used to be a
 * second layer here — hand-authored `gentle`/`bold`/`troll` cuts of eleven
 * levels, picked between attempts by `DifficultyDirector` from the player's
 * own profile. The owner had it removed: "давай уберём систему gentle bold
 * troll, чтобы всегда у нас было одинаково". Every player now meets the
 * same level, always, which also means the level a leaderboard time or a
 * best time was set on is unambiguous without a variant to qualify it.
 *
 * THE SYSTEM still watches and still talks (`Commentator`,
 * `PlayerProfile`, `SystemMemory`); what it no longer does is change what
 * it is watching.
 */
const ALL_LEVELS: LevelDef[] = [
  ...SECTOR_01_LEVELS,
  ...SECTOR_02_LEVELS,
  ...SECTOR_03_LEVELS,
  ...SECTOR_04_LEVELS,
  ...SECTOR_05_LEVELS,
  ...SECTOR_06_LEVELS,
  ...SECTOR_07_LEVELS,
  ...SECTOR_08_LEVELS,
];

export function getLevel(id: string): LevelDef {
  const level = ALL_LEVELS.find((lvl) => lvl.id === id);
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
