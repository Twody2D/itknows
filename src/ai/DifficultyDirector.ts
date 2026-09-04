import type { PlayerProfileData } from './PlayerProfile';
import type { SystemMemoryData } from './SystemMemory';
import { LEVEL_VARIANTS } from '@/data/levels/variants';

const STRUGGLE_THRESHOLD = 2;
const THRIVING_STREAK = 3;
/**
 * Jumps per second of active horizontal movement, EMA-smoothed
 * (`PlayerProfile.jumpFrequency`). Sector 01's first two levels alone put a
 * gap or spike cluster roughly every 15-20 tiles, which a player clearing
 * them without dying already settles above this by the third level — high
 * enough that it can't fire on a fresh profile (starts at 0), low enough
 * that it doesn't need an unrealistically twitchy player to reach.
 */
const HABITUAL_JUMPER_THRESHOLD = 0.35;

/**
 * Picks which pre-authored variant of a level to hand the player next —
 * never mid-attempt, only ever called from `GameplayScene.init()` before
 * the level is built (CLAUDE.md #4.1: adaptation is between-attempt only,
 * enforced structurally by *where* this is called, not by a runtime check
 * here).
 *
 * Deliberately narrow (master-prompt §67): the only choices are a level's
 * own hand-authored `gentle`/`bold`/`troll` variants, all of which already
 * pass `LevelValidator` and the honesty invariants — there is no "make it
 * unplayable" branch, and a level with no variants always returns
 * `'standard'`. This is picking *which honest version* of the level to
 * show, not scaling difficulty open-endedly.
 *
 * `troll` (master-prompt §15) is a separate axis from struggling/thriving:
 * it doesn't move difficulty, it subverts an established habit — so it only
 * gets a look-in once neither of those already claimed the pick. Struggling
 * keeps priority (a player already failing gets the safety net, not a
 * surprise) and a hot streak keeps its reward; `troll` fills the ordinary
 * remaining case where the player's own recent behavior shows a habit
 * strong enough for the subversion to actually land as one.
 */
export function selectVariant(levelId: string, profile: PlayerProfileData, memory: SystemMemoryData): string {
  const variants = LEVEL_VARIANTS[levelId];
  if (!variants) return 'standard';

  // Each condition below claims the pick outright once it applies, even if
  // this particular level has nothing authored for it (falls to
  // 'standard') — struggling/thriving must never fall through into the
  // unrelated troll branch just because this level's gentle/bold happens to
  // be missing.
  const struggling = memory.repeatDeathCount >= STRUGGLE_THRESHOLD;
  if (struggling) return variants.gentle ? 'gentle' : 'standard';

  const thriving = memory.currentStreak >= THRIVING_STREAK && profile.recentFailures === 0;
  if (thriving) return variants.bold ? 'bold' : 'standard';

  const habitualJumper = profile.jumpFrequency >= HABITUAL_JUMPER_THRESHOLD;
  if (habitualJumper && variants.troll) return 'troll';

  return 'standard';
}
