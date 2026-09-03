import type { PlayerProfileData } from './PlayerProfile';
import type { SystemMemoryData } from './SystemMemory';
import { LEVEL_VARIANTS } from '@/data/levels/variants';

const STRUGGLE_THRESHOLD = 2;
const THRIVING_STREAK = 3;

/**
 * Picks which pre-authored variant of a level to hand the player next —
 * never mid-attempt, only ever called from `GameplayScene.init()` before
 * the level is built (CLAUDE.md #4.1: adaptation is between-attempt only,
 * enforced structurally by *where* this is called, not by a runtime check
 * here).
 *
 * Deliberately narrow (master-prompt §67): the only choices are a level's
 * own hand-authored `gentle`/`bold` variants, both of which already pass
 * `LevelValidator` and the honesty invariants — there is no "make it
 * unplayable" branch, and a level with no variants always returns
 * `'standard'`. This is picking *which honest version* of the level to
 * show, not scaling difficulty open-endedly.
 */
export function selectVariant(levelId: string, profile: PlayerProfileData, memory: SystemMemoryData): string {
  const variants = LEVEL_VARIANTS[levelId];
  if (!variants) return 'standard';

  const struggling = memory.repeatDeathCount >= STRUGGLE_THRESHOLD;
  if (struggling && variants.gentle) return 'gentle';

  const thriving = memory.currentStreak >= THRIVING_STREAK && profile.recentFailures === 0;
  if (thriving && variants.bold) return 'bold';

  return 'standard';
}
