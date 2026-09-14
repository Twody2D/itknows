import { EventBus } from '@/core/EventBus';
import { LeaderboardService } from './LeaderboardService';

/**
 * Submits a level's finish time to its leaderboard on every real completion,
 * the same "wire onto the existing event, no new call site" pattern as
 * `shop/EconomyRewards.ts`. Imported once from `main.ts` for its side
 * effect.
 */
EventBus.on('level:completed', ({ levelId, timeMs }) => {
  void LeaderboardService.submitLevelScore(levelId, timeMs);
});
